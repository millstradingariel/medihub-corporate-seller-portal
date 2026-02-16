const sanityClient = require("../config/sanityClient");
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

exports.fetchLocations = async () => {
    const query = `
    *[_type == "location"]{
      _id,
      name,
      locationid,
      shippingAddress,
      shippingCity,
      shippingState,
      shippingPostcode,
      devices
    }
  `;

    return await sanityClient.fetch(query);
};

exports.fetchProducts = async () => {
    try {
        const cached = cache.get('products');
        if (cached) {
            console.log('✅ Returning cached products');
            return cached;
        }

        console.log('🔄 Fetching products from Sanity (including drafts)...');

        const query = `
        *[_type == "product" && store.isDeleted != true] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "variants": store.variants[]-> {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        } | order(store.title asc)
        `;

        const products = await sanityClient.fetch(query);

        // Filter out products with empty/invalid variants
        const validProducts = (products || []).filter(p => 
            p.variants && 
            Array.isArray(p.variants) &&
            p.variants.length > 0 && 
            p.variants.some(v => v.variantId !== null && v.inventory !== null)
        );

        const response = {
            products: validProducts,
            count: validProducts.length,
            timestamp: new Date().toISOString()
        };

        cache.set('products', response);

        console.log(`✅ Fetched and cached ${response.count} products (including drafts)`);
        return response;
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        throw new Error('Failed to fetch products from Sanity');
    }
};

/**
 * Fetch only active products (excludes archived)
 */
exports.fetchActiveProducts = async () => {
    try {
        const query = `
        *[_type == "product" && store.status == "active" && store.isDeleted != true] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "variants": store.variants[]-> {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        } | order(store.title asc)
        `;

        const products = await sanityClient.fetch(query);

        return {
            products: products || [],
            count: products?.length || 0,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error fetching active products:', error);
        throw new Error('Failed to fetch active products');
    }
};

/**
 * Fetch only archived products
 */
exports.fetchArchivedProducts = async () => {
    try {
        const query = `
        *[_type == "product" && store.status == "archived" && store.isDeleted != true] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "variants": store.variants[]-> {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        } | order(store.title asc)
        `;

        const products = await sanityClient.fetch(query);

        return {
            products: products || [],
            count: products?.length || 0,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error fetching archived products:', error);
        throw new Error('Failed to fetch archived products');
    }
};

/**
 * Fetch products by type (category) - including archived
 */
exports.fetchProductsByType = async (productType) => {
    try {
        const query = `
        *[_type == "product" && store.productType == "${productType}" && store.isDeleted != true] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "variants": store.variants[]-> {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        } | order(store.title asc)
        `;

        const products = await sanityClient.fetch(query);

        return {
            products: products || [],
            count: products?.length || 0,
            productType: productType,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`❌ Error fetching products by type (${productType}):`, error);
        throw new Error(`Failed to fetch products of type: ${productType}`);
    }
};

/**
 * Fetch only products with available stock (excludes archived and out of stock)
 */
exports.fetchAvailableProducts = async () => {
    try {
        const query = `
        *[_type == "product" && store.status == "active" && store.isDeleted != true] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "variants": store.variants[]->select(inventory.available > 0) {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        } | order(store.title asc)
        `;

        const products = await sanityClient.fetch(query);

        return {
            products: products || [],
            count: products?.length || 0,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error fetching available products:', error);
        throw new Error('Failed to fetch available products');
    }
};

/**
 * Fetch single product by ID with variants
 */
exports.fetchProductById = async (productId) => {
    try {
        const query = `
        *[_type == "product" && store.id == ${productId}][0] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "description": store.store.descriptionHtml,
          "variants": store.variants[]-> {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        }
        `;

        const product = await sanityClient.fetch(query);

        if (!product) {
            throw new Error(`Product ${productId} not found`);
        }

        return {
            product: product,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`❌ Error fetching product ${productId}:`, error);
        throw new Error(`Failed to fetch product ${productId}`);
    }
};

/**
 * Search products by title or SKU - including archived
 */
exports.searchProducts = async (searchTerm) => {
    try {
        const lowerSearch = searchTerm.toLowerCase();

        const query = `
        *[_type == "product" && store.isDeleted != true &&
          (store.title match "${lowerSearch}*" || store.variants[].sku match "${lowerSearch}*")] {
          _id,
          "productId": store.id,
          "title": store.title,
          "vendor": store.vendor,
          "productType": store.productType,
          "images": store.previewImageUrl,
          "tags": store.tags,
          "status": store.status,
          "variants": store.variants[]-> {
            "variantId": store.id,
            "sku": store.sku,
            "name": store.option1,
            "price": store.price,
            "compareAtPrice": store.compareAtPrice,
            "inventory": store.inventory,
            "imageUrls": store.imageUrls,
            "status": store.status
          },
          "updatedAt": store.updatedAt
        } | order(store.title asc)
        `;

        const products = await sanityClient.fetch(query);

        return {
            products: products || [],
            count: products?.length || 0,
            searchTerm: searchTerm,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`❌ Error searching products (${searchTerm}):`, error);
        throw new Error(`Failed to search products with term: ${searchTerm}`);
    }
};

/**
 * Clear products cache
 */
exports.clearProductsCache = () => {
    cache.del('products');
    console.log('🗑️ Products cache cleared');
};

/**
 * Get cache statistics
 */
exports.getCacheStats = () => {
    return {
        keys: cache.keys(),
        stats: cache.getStats()
    };
};