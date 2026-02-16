const express = require("express");
const router = express.Router();
const { fetchWholesaleOrdersFromShopify } = require("../shopify/fetchOrders.js"); 

router.get("/fetchWholesaleOrders", async (req, res) => {
    try {
        console.log("🔄 Fetching wholesale orders from Shopify...");
        const orders = await fetchWholesaleOrdersFromShopify(); 
        console.log(`✅ Fetched ${orders.length} wholesale orders`);

        res.json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (err) {
        console.error("❌ Failed to fetch wholesale orders:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch wholesale orders",
            details: err.message,
        });
    }
});

module.exports = router;