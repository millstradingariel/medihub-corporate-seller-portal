const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");
const { pool } = require("../db");

router.get("/devices", async (req, res) => {
    try {
        // 1️⃣ Fetch devices from Sanity
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

        // 2️⃣ Insert / update MySQL
        for (const device of devices) {
            await pool.query(
                `
        INSERT INTO devices
          (sanity_id, device_id, internal_id, model, device_type)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          device_id = VALUES(device_id),
          internal_id = VALUES(internal_id),
          model = VALUES(model),
          device_type = VALUES(device_type)
        `,
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

module.exports = router;
