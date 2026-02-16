const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { pool } = require('../db'); // ✅ add this
const { syncWholesaleOrdersToMySQL } = require("../services/shopifyService");
const { authenticate } = require('../middlewares/authenticate');
const { auditLogger } = require('../services/auditLogger'); // ✅ add this

router.post("/create", authenticate, async (req, res) => {
    const {
        deliveryAddress,
        deliveryCity,
        deliveryProvince,
        deliveryZip,
        deliveryCountry,
        shippingLineTitle,
        shippingLinePrice,
        shippingLineCode,
        items,
        subtotal,
        shippingFee,
        total,
        currency,
        locationId,
        locationName,
        companyId,
        companyName,
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: "No items in order" });
    }

    if (!deliveryZip) {
        return res.status(400).json({ error: "Shipping address is required" });
    }

    try {
        // ✅ Split company name into first and last name
        const nameParts = (companyName || "Unknown Company").split(" ");
        const firstName = nameParts.length > 1
            ? nameParts.slice(0, -1).join(" ")
            : nameParts[0];
        const lastName = nameParts.length > 1
            ? nameParts[nameParts.length - 1]
            : nameParts[0];

        const shopifyPayload = {
            order: {
                test: true,
                customer: {
                    first_name: firstName,
                    last_name: lastName,
                    note: `Company ID: ${companyId}`,
                },
                line_items: items.map((item) => ({
                    variant_id: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                })),
                shipping_address: {
                    address1: deliveryAddress,
                    city: deliveryCity,
                    province: deliveryProvince,
                    zip: deliveryZip,
                    country: deliveryCountry || "AU",
                    company: companyName || "",
                },
                billing_address: {
                    address1: deliveryAddress,
                    city: deliveryCity,
                    province: deliveryProvince,
                    zip: deliveryZip,
                    country: deliveryCountry || "AU",
                    company: companyName || "",
                },
                shipping_lines: [
                    {
                        title: shippingLineTitle || "Standard Delivery",
                        price: shippingLinePrice || shippingFee,
                        code: shippingLineCode || "mills_shipping",
                    },
                ],
                financial_status: "pending",
                fulfillment_status: null,
                currency: currency || "AUD",
                tags: "wholesale, test",
                note: `[TEST] Wholesale order from ${companyName || "unknown"} — Location: ${locationName || "unknown"}`,
                note_attributes: [
                    { name: "company_id", value: String(companyId || "") },
                    { name: "company_name", value: String(companyName || "") },
                    { name: "location_id", value: String(locationId || "") },
                    { name: "location_name", value: String(locationName || "") },
                ],

                metafields: [
                    {
                        key: "partner_id",
                        value: companyId ? String(companyId) : "N/A",
                        type: "single_line_text_field",
                        namespace: "custom",
                    },
                    {
                        key: "utm_source",
                        value: companyName ? String(companyName) : "N/A",
                        type: "single_line_text_field",
                        namespace: "custom",
                    },
                    {
                        key: "location_id",
                        value: locationId ? String(locationId) : "N/A",
                        type: "single_line_text_field",
                        namespace: "custom",
                    },
                    {
                        key: "location_name",
                        value: locationName ? String(locationName) : "N/A",
                        type: "single_line_text_field",
                        namespace: "custom",
                    },
                ],
            },
        };

        console.log("🛍️ Creating Shopify order:", JSON.stringify(shopifyPayload, null, 2));

        const shopifyRes = await fetch(
            `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/orders.json`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
                },
                body: JSON.stringify(shopifyPayload),
            }
        );

        const shopifyData = await shopifyRes.json();

        if (!shopifyRes.ok) {
            console.error("❌ Shopify 400 error:", JSON.stringify(shopifyData, null, 2));
            return res.status(500).json({
                error: "Failed to create Shopify order",
                details: shopifyData.errors,
            });
        }

        const shopifyOrderId = shopifyData.order.id;
        const shopifyOrderName = shopifyData.order.name;
        console.log(`✅ Shopify order created: ${shopifyOrderName} (${shopifyOrderId})`);

        await auditLogger({
            userId: req.user.id,
            userEmail: req.user.email,
            userName: req.user.name,
            roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
            companyId: req.body.companyId,    // ✅ camelCase from frontend payload
            action: 'CREATE_ORDER',
            entityType: 'order',
            entityId: shopifyOrderName,
            details: { total: req.body.total, items: req.body.items?.length },
        });

        res.json({
            success: true,
            shopifyOrderId,
            shopifyOrderName,
            message: `Order ${shopifyOrderName} created successfully`,
        });

    } catch (err) {
        console.error("❌ Wholesale order error:", err);
        res.status(500).json({
            error: "Failed to process order",
            details: err.message,
        });
    }
});

router.get("/sync", authenticate, async (req, res) => {
    try {
        console.log("🔄 Syncing wholesale orders to MySQL...");
        const insertedCount = await syncWholesaleOrdersToMySQL();
        console.log(`✅ Synced ${insertedCount} wholesale orders`);

        res.json({
            success: true,
            count: insertedCount,
            message: `Successfully synced ${insertedCount} wholesale orders`,
        });
    } catch (err) {
        console.error("❌ Failed to sync wholesale orders:", err);
        res.status(500).json({
            success: false,
            error: "Failed to sync wholesale orders",
            details: err.message,
        });
    }
});

router.get("/syncWholesaleOrderByCompanyID", authenticate, async (req, res) => {
    try {
        const { companyId } = req.query;
        console.log('🔍 Fetching orders for companyId:', companyId); // ✅ add this

        let ordersQuery = `SELECT * FROM wholesale_orders ORDER BY created_at DESC`;
        let ordersParams = [];

        if (companyId) {
            ordersQuery = `SELECT * FROM wholesale_orders WHERE company_id = ? ORDER BY created_at DESC`;
            ordersParams = [companyId];
        }

        const [orders] = await pool.execute(ordersQuery, ordersParams);
        console.log('📦 Orders found:', orders.length); // ✅ add this

        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const [items] = await pool.execute(
                    `SELECT * FROM wholesale_order_items WHERE wholesale_orders_id = ?`,
                    [order.wholesale_orders_id]
                );
                return {
                    ...order,
                    items,
                };
            })
        );

        res.json({
            success: true,
            count: ordersWithItems.length,
            orders: ordersWithItems,
        });

    } catch (err) {
        console.error("❌ Failed to get wholesale orders:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get wholesale orders",
            details: err.message,
        });
    }
});

module.exports = router;