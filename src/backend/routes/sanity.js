const express = require("express");
const router = express.Router();
const sanityController = require("../controllers/sanityController");

// test route
router.get("/test", sanityController.test);

// get locations from sanity
router.get("/locations", sanityController.getLocations);
router.get("/products", sanityController.getProducts);

/**
 * GET /api/sanity/products/available
 * Fetch products with available stock only
 */
router.get("/products/available", sanityController.getAvailableProducts);

/**
 * GET /api/sanity/products/type/:productType
 * Fetch products by type/category
 * Example: /api/sanity/products/type/Toilet%20Seat%20Raiser
 */
router.get("/products/type/:productType", sanityController.getProductsByType);

/**
 * GET /api/sanity/products/:productId
 * Fetch single product by ID with full details
 * Example: /api/sanity/products/9706762240329
 */
router.get("/products/:productId", sanityController.getProductById);

/**
 * GET /api/sanity/search?q=search_term
 * Search products by title or SKU
 * Example: /api/sanity/search?q=raised%20toilet
 */
router.get("/search", sanityController.searchProducts);

// ============================================
// ADMIN/PRIVATE ENDPOINTS
// ============================================
// Note: Add authentication middleware as needed

/**
 * POST /api/sanity/cache/clear
 * Clear the products cache
 * Requires admin authentication
 */
router.post("/cache/clear", sanityController.clearCache);

/**
 * GET /api/sanity/cache/stats
 * Get cache statistics for monitoring
 * Requires admin authentication
 */
router.get("/cache/stats", sanityController.getCacheStats);

module.exports = router; // ✅ THIS FIXES YOUR ERROR
