const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");

router.get("/sync-devices", async (req, res) => {
    try {
        const devices = await client.fetch(`
        *[_type == "device" && deviceType == "Kiosk"]{
            _id,
            deviceId,
            internalId,
            model,
            deviceType
        }
        `);

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
            } catch (insertErr) {
            }
        }

        res.json({
            message: "Devices synced successfully",
            data: devices,
            count,
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to sync devices",
            details: err.message
        });
    }
});

router.get("/devices", authenticate, async (req, res) => {
    try {
        const { locationId } = req.query;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        const [locations] = await pool.query(
            'SELECT sanity_id, name FROM locations WHERE id = ?',
            [locationId]
        );

        if (locations.length === 0) {
            return res.json({
                message: "Location not found",
                data: []
            });
        }

        const locationSanityId = locations[0].sanity_id;
        const locationName = locations[0].name;

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
        res.status(500).json({
            error: 'Failed to fetch devices',
            details: err.message
        });
    }
});

router.get("/sync-location-devices", async (req, res) => {
    try {
        const locations = await client.fetch(`
            *[_type == "location"]{
                _id,
                name,
                "devices": devices[]
            }
        `);

        let syncedCount = 0;
        let failedCount = 0;

        for (const location of locations) {

            if (!location.devices || location.devices.length === 0) {
                console.log('  ⚠️ Location has no devices');
                continue;
            }

            for (const device of location.devices) {
                try {

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

                } catch (err) {
                    
                }
            }
        }
        res.json({
            message: "Location-device relationships synced successfully",
            synced: syncedCount,
            failed: failedCount,
            total: locations.length
        });

    } catch (err) {
        res.status(500).json({
            message: "Failed to sync location-devices",
            details: err.message
        });
    }
});

module.exports = router;