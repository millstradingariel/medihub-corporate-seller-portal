const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");

// ✅ CHANGED: Renamed from /devices to /sync-devices
router.get("/sync-devices", async (req, res) => {
    try {
        const devices = await client.fetch(`
      *[_type == "device"]{
        _id,
        deviceId,
        internalId,
        model,
        deviceType
      }
    `);

        let count = 0;

        for (const device of devices) {
            await pool.query(
                `INSERT INTO devices
                  (sanity_id, device_id, internal_id, model, device_type)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   device_id = VALUES(device_id),
                   internal_id = VALUES(internal_id),
                   model = VALUES(model),
                   device_type = VALUES(device_type)`,
                [
                    device._id,
                    device.deviceId,
                    device.internalId || null,
                    device.model || null,
                    Array.isArray(device.deviceType)
                        ? device.deviceType.join(",")
                        : device.deviceType || null,
                ]
            );
            count++;
        }

        res.json({
            message: "Devices synced successfully",
            data: devices,
            count,
        });
    } catch (err) {
        console.error("Device sync failed:", err);
        res.status(500).json({ message: "Failed to sync devices" });
    }
});

// ✅ NEW: Get devices for a specific location (filtered)
router.get("/devices", authenticate, async (req, res) => {
    try {
        const { locationId } = req.query;

        console.log('📱 Fetching devices for locationId:', locationId);

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        // Get location's sanity_id from location_id
        const [locations] = await pool.query(
            'SELECT sanity_id, name FROM locations WHERE location_id = ?',
            [locationId]
        );

        if (locations.length === 0) {
            console.log('⚠️ Location not found for location_id:', locationId);
            return res.json({ data: [] });
        }

        const locationSanityId = locations[0].sanity_id;
        console.log('🔍 Location sanity_id:', locationSanityId);

        // Get devices for this location
        const [rows] = await pool.query(`
            SELECT 
                d.sanity_id AS _id,
                d.device_id AS deviceId,
                d.internal_id AS internalId,
                d.model,
                d.device_type AS deviceType
            FROM devices d
            INNER JOIN location_devices ld ON d.sanity_id = ld.device_sanity_ref
            WHERE ld.location_sanity_id = ?
        `, [locationSanityId]);

        console.log('📦 Found', rows.length, 'device(s) for location');

        // Parse deviceType to array
        const devices = rows.map(device => ({
            ...device,
            deviceType: device.deviceType ? device.deviceType.split(',').map(t => t.trim()) : []
        }));

        res.json({ data: devices });

    } catch (err) {
        console.error('❌ Fetch devices error:', err);
        res.status(500).json({ error: 'Failed to fetch devices', details: err.message });
    }
});

module.exports = router;