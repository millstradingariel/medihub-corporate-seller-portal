// backend/routes/locations.js
const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");
const { authenticate } = require('../middlewares/authenticate');

router.get('/locationsss', authenticate, async (req, res) => {
  try {
    const { companyId } = req.query;

    console.log('📍 Fetching locations for companyId:', companyId);

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const [rows] = await pool.query(`
      SELECT 
        l.id AS _id,
        l.location_id,
        l.name AS location_name,
        l.shipping_address,
        l.shipping_city,
        l.shipping_postcode,
        l.shipping_state,
        l.sanity_id
      FROM locations l
      JOIN company_locations cl ON l.sanity_id = cl.location_sanity_id
      JOIN company c ON cl.company_sanity_id = c._id
      WHERE c.company_id = ?
    `, [companyId]);

    console.log('📦 Found locations:', rows.length);

    res.json({ data: rows });
  } catch (err) {
    console.error('❌ Fetch locations error:', err);
    res.status(500).json({ error: 'Failed to fetch locations', details: err.message });
  }
});

// Link a location to a company
router.post("/company-locations", async (req, res) => {
  try {
    const { company_id, location_sanity_id, ref_key } = req.body;

    // Get company's _id (UUID) from company_id
    const [companies] = await pool.query(
      'SELECT _id FROM company WHERE company_id = ?',
      [company_id]
    );

    if (companies.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company_sanity_id = companies[0]._id;

    // Insert into company_locations
    await pool.execute(
      `INSERT INTO company_locations 
        (company_sanity_id, location_sanity_id, ref_key, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         ref_key = VALUES(ref_key)`,
      [company_sanity_id, location_sanity_id, ref_key]
    );

    res.json({ message: "Location linked to company successfully" });
  } catch (err) {
    console.error("Link location error:", err);
    res.status(500).json({ error: "Failed to link location", details: err.message });
  }
});

module.exports = router;