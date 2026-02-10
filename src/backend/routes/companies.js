const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");

router.get("/company", async (req, res) => {
  try {
    // 1️⃣ Fetch companies from Sanity
    const companies = await client.fetch(`*[_type == "company"]{
      _id,
      name,
      companyid,
      abn,
      locations[]{
        _key,
        _ref
      }
    }`);

    let companyCount = 0;
    let companyLocationsCount = 0;

    for (const company of companies) {
      // 2️⃣ Insert/Update company
      await pool.execute(
        `INSERT INTO company (_id, company_id, company_name, company_abn, created_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           company_name = VALUES(company_name),
           company_abn = VALUES(company_abn)`,
        [company._id, company.companyid, company.name, company.abn]
      );
      companyCount++;

      // 3️⃣ Insert/Update company_locations
      if (Array.isArray(company.locations)) {
        for (const loc of company.locations) {
          await pool.execute(
            `INSERT INTO company_locations (company_sanity_id, location_sanity_id, ref_key)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE ref_key = VALUES(ref_key)`,
            [company._id, loc._ref, loc._key]
          );
          companyLocationsCount++;
        }
      }
    }

    res.json({
      message: "Companies synced successfully",
      companyCount,
      companyLocationsCount,
      data: companies
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync companies", details: err.message });
  }
});

module.exports = router;


// GET all companies (Super Admin only)
router.get("/view/companies", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        company_id,
        _id,
        company_name,
        company_abn,
        created_at
      FROM company
      ORDER BY created_at DESC
    `);

    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});

module.exports = router;
