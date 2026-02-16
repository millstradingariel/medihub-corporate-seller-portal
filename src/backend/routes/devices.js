const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");

// ✅ Sync all devices from Sanity
router.get("/sync-devices", async (req, res) => {
    try {
        console.log('🔄 Syncing devices from Sanity...');

        const devices = await client.fetch(`
        *[_type == "device" && deviceType == "Kiosk"]{
            _id,
            deviceId,
            internalId,
            model,
            deviceType
        }
        `);

        console.log('📦 Found', devices.length, 'devices in Sanity');

        let count = 0;

        for (const device of devices) {
            try {
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
            } catch (insertErr) {
                console.error('⚠️ Failed to sync device', device._id, ':', insertErr);
            }
        }

        res.json({
            message: "Devices synced successfully",
            data: devices,
            count,
        });
    } catch (err) {
        console.error("❌ Device sync failed:", err);
        res.status(500).json({
            message: "Failed to sync devices",
            details: err.message
        });
    }
});

// ✅ Get devices for a specific location
router.get("/devices", authenticate, async (req, res) => {
    try {
        const { locationId } = req.query;

        console.log('📱 Fetching devices for locationId:', locationId);

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        // ✅ FIXED: Query by id (MongoDB _id), not location_id
        const [locations] = await pool.query(
            'SELECT sanity_id, name FROM locations WHERE id = ?',
            [locationId]
        );

        if (locations.length === 0) {
            console.log('⚠️ Location not found for id:', locationId);
            return res.json({
                message: "Location not found",
                data: []
            });
        }

        const locationSanityId = locations[0].sanity_id;
        const locationName = locations[0].name;
        console.log('🔍 Location sanity_id:', locationSanityId, 'Name:', locationName);

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
            WHERE ld.location_sanity_id = ? AND d.device_type = "kiosk"
        `, [locationSanityId]);

        console.log('📦 Found', rows.length, 'device(s) for location');

        // Parse deviceType to array
        const devices = rows.map(device => ({
            ...device,
            deviceType: device.deviceType
                ? device.deviceType.split(',').map(t => t.trim())
                : []
        }));

        res.json({
            message: "Devices fetched successfully",
            data: devices,
            count: devices.length,
            location: locationName
        });

    } catch (err) {
        console.error('❌ Fetch devices error:', err);
        res.status(500).json({
            error: 'Failed to fetch devices',
            details: err.message
        });
    }
});

// ✅ NEW: Sync devices to locations from Sanity
router.get("/sync-location-devices", async (req, res) => {
    try {
        console.log('🔄 Syncing device-location relationships from Sanity...');

        // ✅ MISSING: Fetch locations from Sanity
        const locations = await client.fetch(`
            *[_type == "location"]{
                _id,
                name,
                "devices": devices[]
            }
        `);

        console.log('📦 Found', locations.length, 'locations in Sanity');

        // ✅ MISSING: Initialize counters
        let syncedCount = 0;
        let failedCount = 0;

        for (const location of locations) {
            console.log('🏢 Processing location:', location._id);

            if (!location.devices || location.devices.length === 0) {
                console.log('  ⚠️ Location has no devices');
                continue;
            }

            console.log('  📱 Found', location.devices.length, 'devices');

            for (const device of location.devices) {
                try {
                    console.log('  📍 Device ref:', device._ref);

                    // Fetch device details from Sanity
                    const deviceData = await client.fetch(`*[_id == "${device._ref}"][0]{
                        _id,
                        deviceId,
                        deviceType
                    }`);

                    if (!deviceData) {
                        console.warn('  ⚠️ Device not found:', device._ref);
                        failedCount++;
                        continue;
                    }

                    // Process deviceType
                    let deviceType = null;
                    if (deviceData.deviceType) {
                        if (Array.isArray(deviceData.deviceType)) {
                            deviceType = deviceData.deviceType.join(",");
                        } else {
                            deviceType = deviceData.deviceType;
                        }
                    }

                    console.log('  Data to insert:', {
                        location_sanity_id: location._id,
                        device_sanity_ref: device._ref,
                        device_key: device._key,
                        device_type: deviceType
                    });

                    // ✅ CORRECT INSERT
                    const [result] = await pool.query(
                        `INSERT INTO location_devices
                            (location_sanity_id, device_sanity_ref, device_key, device_type)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            device_key = VALUES(device_key),
                            device_type = VALUES(device_type),
                            created_at = NOW()`,
                        [
                            location._id,
                            device._ref,
                            device._key || null,
                            deviceType
                        ]
                    );

                    console.log('  ✅ Inserted');
                    syncedCount++;

                } catch (err) {
                    console.error('  ❌ Error:', err.message);
                    failedCount++;
                }
            }
        }

        // ✅ MISSING: Final response
        console.log('\n✅ Location-device sync completed');
        console.log('   Synced:', syncedCount);
        console.log('   Failed:', failedCount);

        res.json({
            message: "Location-device relationships synced successfully",
            synced: syncedCount,
            failed: failedCount,
            total: locations.length
        });

    } catch (err) {
        // ✅ MISSING: Error handling
        console.error("❌ Sync failed:", err);
        res.status(500).json({
            message: "Failed to sync location-devices",
            details: err.message
        });
    }
});

module.exports = router;