const sanityService = require("../services/sanityService");

exports.test = (req, res) => {
  res.json({ message: "Sanity route working ✅" });
};

exports.getLocations = async (req, res) => {
  try {
    const locations = await sanityService.fetchLocations();
    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await sanityService.fetchProducts();
    res.json(products);
  } catch (err) {
    console.error('❌ Controller error:', err);
    res.status(500).json({ 
      message: "Failed to fetch products",
      error: err.message 
    });
  }
};

/**
 * GET /api/sanity/products/type/:productType
 * Fetch products by type/category
 */
exports.getProductsByType = async (req, res) => {
  try {
    const { productType } = req.params;
    
    if (!productType) {
      return res.status(400).json({ message: "Product type is required" });
    }

    const products = await sanityService.fetchProductsByType(productType);
    res.json(products);
  } catch (err) {
    console.error('❌ Controller error:', err);
    res.status(500).json({ 
      message: "Failed to fetch products by type",
      error: err.message 
    });
  }
};

/**
 * GET /api/sanity/products/available
 * Fetch only products with available stock
 */
exports.getAvailableProducts = async (req, res) => {
  try {
    const products = await sanityService.fetchAvailableProducts();
    res.json(products);
  } catch (err) {
    console.error('❌ Controller error:', err);
    res.status(500).json({ 
      message: "Failed to fetch available products",
      error: err.message 
    });
  }
};

/**
 * GET /api/sanity/products/:productId
 * Fetch single product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ message: "Valid product ID is required" });
    }

    const product = await sanityService.fetchProductById(parseInt(productId));
    res.json(product);
  } catch (err) {
    console.error('❌ Controller error:', err);
    
    if (err.message.includes('not found')) {
      return res.status(404).json({ 
        message: "Product not found",
        error: err.message 
      });
    }

    res.status(500).json({ 
      message: "Failed to fetch product",
      error: err.message 
    });
  }
};

/**
 * GET /api/sanity/search?q=search_term
 * Search products by title or SKU
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const products = await sanityService.searchProducts(q.trim());
    res.json(products);
  } catch (err) {
    console.error('❌ Controller error:', err);
    res.status(500).json({ 
      message: "Failed to search products",
      error: err.message 
    });
  }
};

/**
 * POST /api/sanity/cache/clear
 * Clear products cache (for admin/webhooks)
 * Requires admin authentication
 */
exports.clearCache = async (req, res) => {
  try {
    // TODO: Add authentication check here
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({ message: "Unauthorized" });
    // }

    sanityService.clearProductsCache();
    res.json({ 
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Controller error:', err);
    res.status(500).json({ 
      message: "Failed to clear cache",
      error: err.message 
    });
  }
};

exports.getCacheStats = async (req, res) => {
  try {
    // TODO: Add authentication check here
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({ message: "Unauthorized" });
    // }

    const stats = sanityService.getCacheStats();
    res.json(stats);
  } catch (err) {
    console.error('❌ Controller error:', err);
    res.status(500).json({ 
      message: "Failed to get cache stats",
      error: err.message 
    });
  }
};