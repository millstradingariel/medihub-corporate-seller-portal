const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");
const { authenticate } = require('../middlewares/authenticate');

router.get('/locations', authenticate, async (req, res) => {
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

    res.json({
      message: "Locations fetched successfully",
      data: rows,
      count: rows.length
    });
  } catch (err) {
    console.error('❌ Fetch locations error:', err);
    res.status(500).json({
      error: 'Failed to fetch locations',
      details: err.message
    });
  }
});

router.get('/test-sanity-locations', async (req, res) => {
  try {
    const locations = await client.fetch(`
      *[_type == "location"]{
        _id,
        "location_id": locationid,
        name,
        "shipping_address": shippingAddress,
        "shipping_city": shippingCity,
        "shipping_postcode": shippingPostcode,
        "shipping_state": shippingState
      }
    `);

    console.log('📦 Found', locations.length, 'locations in Sanity');

    res.json({
      message: "Locations fetched successfully",
      count: locations.length,
      data: locations
    });

  } catch (err) {
    console.error('❌ Fetch locations error:', err);
    res.status(500).json({
      error: 'Failed to fetch locations',
      details: err.message
    });
  }
});

router.get("/sync-company-locations", authenticate, async (req, res) => {
  try {

    if (companies.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const companySanityId = companies[0]._id;

    const locations = await client.fetch(`
      *[_type == "location" && company._ref == "${companySanityId}"]{
        _id,
        "location_id": locationid,
        name,
        "shipping_address": shippingAddress,
        "shipping_city": shippingCity,
        "shipping_postcode": shippingPostcode,
        "shipping_state": shippingState
      }
    `);

    console.log('📦 Found', locations.length, 'locations in Sanity');

    let syncedCount = 0;

    for (const loc of locations) {
      try {
        await pool.query(
          `INSERT INTO locations
            (sanity_id, location_id, name, shipping_address, shipping_city, shipping_postcode, shipping_state)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             location_id = VALUES(location_id),
             name = VALUES(name),
             shipping_address = VALUES(shipping_address),
             shipping_city = VALUES(shipping_city),
             shipping_postcode = VALUES(shipping_postcode),
             shipping_state = VALUES(shipping_state)`,
          [
            loc._id,
            loc.location_id,
            loc.name || null,
            loc.shipping_address || null,
            loc.shipping_city || null,
            loc.shipping_postcode || null,
            loc.shipping_state || null,
          ]
        );

        await pool.query(
          `INSERT INTO company_locations 
            (company_sanity_id, location_sanity_id, created_at)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             created_at = NOW()`,
          [companySanityId, loc._id]
        );

        syncedCount++;
      } catch (insertErr) {
        console.error('⚠️ Failed to sync location', loc._id, ':', insertErr);
      }
    }

    console.log('✅ Synced', syncedCount, 'locations');

    const [syncedRows] = await pool.query(`
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
      WHERE cl.company_sanity_id = ?
    `, [companySanityId]);

    res.json({
      message: "Locations synced successfully",
      data: syncedRows,
      count: syncedCount
    });

  } catch (err) {
    console.error("❌ Location sync failed:", err);
    res.status(500).json({
      message: "Failed to sync locations",
      details: err.message
    });
  }
});

router.post("/company-locations", authenticate, async (req, res) => {
  try {
    const { company_id, location_sanity_id } = req.body;

    if (!company_id || !location_sanity_id) {
      return res.status(400).json({
        error: "company_id and location_sanity_id are required"
      });
    }

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
        (company_sanity_id, location_sanity_id, created_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         created_at = NOW()`,
      [company_sanity_id, location_sanity_id]
    );

    res.json({ message: "Location linked to company successfully" });

  } catch (err) {
    console.error("❌ Link location error:", err);
    res.status(500).json({
      error: "Failed to link location",
      details: err.message
    });
  }
});

/**
 * Test endpoint to sync ALL locations from Sanity (without company filter)
 * Useful for debugging and testing
 */
router.get("/sync-company-locations-test", async (req, res) => {
  try {
    console.log('🔄 Starting test location sync (no company filter)...');

    // 1️⃣ Fetch ALL locations from Sanity (no company filter)
    const locations = await client.fetch(`
      *[_type == "location"]{
        _id,
        "location_id": locationid,
        name,
        "shipping_address": shippingAddress,
        "shipping_city": shippingCity,
        "shipping_postcode": shippingPostcode,
        "shipping_state": shippingState
      }
    `);

    console.log('📦 Found', locations.length, 'locations in Sanity');

    if (locations.length === 0) {
      return res.json({
        message: "No locations found in Sanity",
        data: [],
        count: 0
      });
    }

    let syncedCount = 0;
    let failedCount = 0;

    // 2️⃣ Sync each location to MySQL
    for (const loc of locations) {
      try {
        console.log('📍 Syncing location:', loc.location_id);

        await pool.query(
          `INSERT INTO locations
            (sanity_id, location_id, name, shipping_address, shipping_city, shipping_postcode, shipping_state)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             location_id = VALUES(location_id),
             name = VALUES(name),
             shipping_address = VALUES(shipping_address),
             shipping_city = VALUES(shipping_city),
             shipping_postcode = VALUES(shipping_postcode),
             shipping_state = VALUES(shipping_state)`,
          [
            loc._id,
            loc.location_id,
            loc.name || null,
            loc.shipping_address || null,
            loc.shipping_city || null,
            loc.shipping_postcode || null,
            loc.shipping_state || null,
          ]
        );

        syncedCount++;
        console.log('✅ Synced:', loc.location_id);

      } catch (insertErr) {
        failedCount++;
        console.error('⚠️ Failed to sync location', loc._id, ':', insertErr.message);
      }
    }

    console.log('✅ Test sync completed:', { synced: syncedCount, failed: failedCount });

    // 3️⃣ FIXED: Fetch synced rows from MySQL
    const [syncedRows] = await pool.query(`
      SELECT 
        id AS _id,
        location_id,
        name AS location_name,
        shipping_address,
        shipping_city,
        shipping_postcode,
        shipping_state,
        sanity_id
      FROM locations
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      message: "Test sync completed successfully",
      data: syncedRows,  // ✅ FIXED: Now uses actual syncedRows
      synced: syncedCount,
      failed: failedCount,
      total: locations.length
    });

  } catch (err) {
    console.error("❌ Location sync failed:", err);
    res.status(500).json({
      message: "Failed to sync locations",
      details: err.message
    });
  }
});

router.get("/sync-company-locations-refs-test", async (req, res) => {
  try {
    console.log('🧪 Testing company-location references fetch...');

    // 1️⃣ Fetch companies with location references from Sanity
    const companies = await client.fetch(`
      *[_type == "company"]{
        _id,
        "company_id": companyid,
        name,
        "locations": locations[]{
          _key,
          _ref
        }
      }
    `);

    console.log('📦 Found', companies.length, 'companies in Sanity');

    // ✅ FIX: Early return if no companies
    if (companies.length === 0) {
      return res.json({
        message: "No companies found in Sanity",
        data: [],
        synced: 0,
        failed: 0,
        total: 0
      });
    }

    let syncedCount = 0;
    let failedCount = 0;
    const results = [];

    // 2️⃣ Process each company and its locations
    for (const company of companies) {
      try {
        console.log('🏢 Processing company:', company.name);

        // ✅ FIX: Check if company exists in MySQL
        const [existingCompany] = await pool.query(
          'SELECT _id FROM company WHERE _id = ?',
          [company._id]
        );

        if (existingCompany.length === 0) {
          console.warn('⚠️ Company not found in MySQL:', company._id);
          failedCount++;
          results.push({
            company: company.name,
            status: 'skipped',
            reason: 'Company not in MySQL',
            locations: 0
          });
          continue;
        }

        const companySanityId = company._id;

        // ✅ FIX: Check if company has locations
        if (!company.locations || company.locations.length === 0) {
          console.warn('⚠️ Company has no location references:', company.name);
          results.push({
            company: company.name,
            status: 'no_locations',
            locations: 0
          });
          continue;
        }

        let locationCount = 0;

        // 3️⃣ Process each location reference for this company
        for (const locationRef of company.locations) {
          try {
            console.log('  📍 Syncing location ref:', locationRef._ref);

            // ✅ FIX: Check if location exists in MySQL
            const [existingLocation] = await pool.query(
              'SELECT id FROM locations WHERE sanity_id = ?',
              [locationRef._ref]
            );

            if (existingLocation.length === 0) {
              console.warn('  ⚠️ Location not found in MySQL:', locationRef._ref);
              continue;
            }

            // ✅ FIX: Insert using correct property names from Sanity data
            const [insertResult] = await pool.query(
              `INSERT INTO company_locations
                (company_sanity_id, location_sanity_id, ref_key, created_at)
               VALUES (?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE
                 company_sanity_id = VALUES(company_sanity_id),
                 location_sanity_id = VALUES(location_sanity_id),
                 ref_key = VALUES(ref_key),
                 created_at = NOW()`,
              [
                companySanityId,           // ✅ Use company._id (Sanity ID)
                locationRef._ref,          // ✅ Use location reference ID
                locationRef._key || null   // ✅ Use location reference key
              ]
            );

            console.log('  ✅ Location reference synced:', locationRef._ref);
            locationCount++;
            syncedCount++;

          } catch (locErr) {
            failedCount++;
            console.error('  ❌ Failed to sync location ref:', locationRef._ref, ':', locErr.message);
          }
        }

        results.push({
          company: company.name,
          company_id: company.company_id,
          status: 'success',
          locations: locationCount
        });

      } catch (compErr) {
        failedCount++;
        console.error('❌ Failed to process company:', company.name, ':', compErr.message);
        results.push({
          company: company.name,
          status: 'failed',
          error: compErr.message,
          locations: 0
        });
      }
    }

    console.log('✅ Test sync completed:', { synced: syncedCount, failed: failedCount });

    // ✅ FIX: Return proper response with all data
    res.json({
      message: "Company-location references synced successfully",
      synced: syncedCount,
      failed: failedCount,
      total: companies.length,
      results: results
    });

  } catch (err) {
    console.error("❌ Test failed:", err);
    res.status(500).json({
      message: "Test failed",
      details: err.message
    });
  }
});

module.exports = router;