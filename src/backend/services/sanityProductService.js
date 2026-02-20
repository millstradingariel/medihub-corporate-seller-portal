const client = require("../config/sanityClient");

exports.getProducts = async (locationid) => {
  const query = `
    *[
      _type == "productVariant" &&
      store.isDeleted != true &&
      store.locationid == $locationid
    ]{
      _id,
      "variantId": store.id,
      "productId": store.productId,
      "title": store.title,
      "sku": store.sku,
      "price": store.price,
      "compareAtPrice": store.compareAtPrice,
      "available": store.inventory.available,
      "isAvailable": store.inventory.isAvailable,
      "images": store.imageUrls,
      "status": store.status,
      "updatedAt": store.updatedAt
    }
  `;

  return client.fetch(query, {
    locationid: Number(locationid),
  });
};
