// backend/routes/locations.js
const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient"); // Sanity client
const { pool } = require("../db"); // MySQL2 pool

router.get("/locationsss", async (req, res) => {
  try {
    // 1️⃣ Fetch locations from Sanity
    const locations = await client.fetch(`*[_type == "location"]{
      _id,
      locationid,
      name,
      shippingAddress,
      shippingCity,
      shippingPostcode,
      shippingState,
      devices[] {
        _key,
        _ref,
        _type
      }
    }`);

    let countLocations = 0;
    let countLocationDevices = 0;

    for (const loc of locations) {
      // 2️⃣ Insert or update locations table
      await pool.execute(
        `INSERT INTO locations 
          (sanity_id, location_id, name, shipping_address, shipping_city, shipping_postcode, shipping_state, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           shipping_address = VALUES(shipping_address),
           shipping_city = VALUES(shipping_city),
           shipping_postcode = VALUES(shipping_postcode),
           shipping_state = VALUES(shipping_state)`,
        [
          loc._id,
          loc.locationid,
          loc.name,
          loc.shippingAddress || null,
          loc.shippingCity || null,
          loc.shippingPostcode || null,
          loc.shippingState || null,
        ]
      );

      countLocations++;

      // 3️⃣ Insert location_devices mapping
      if (Array.isArray(loc.devices)) {
        for (const device of loc.devices) {
          await pool.execute(
            `INSERT INTO location_devices
              (location_sanity_id, device_sanity_ref, device_key, device_type, created_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               device_type = VALUES(device_type)`,
            [
              loc._id,
              device._ref,
              device._key,
              device._type
            ]
          );
          countLocationDevices++;
        }
      }
    }

    res.json({
      message: "Locations and devices synced successfully",
      locationsSynced: countLocations,
      locationDevicesSynced: countLocationDevices,
      data: locations
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync locations", details: err.message });
  }
});

module.exports = router;
