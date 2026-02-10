const sanityClient = require("@sanity/client");
const product_sanity_id = process.env.PRODUCT_SANITY_ID;
const prod = process.env.SANITY_DATASET;
const apiVer = process.env.SANITY_API_VERSION;

module.exports = sanityClient.createClient({
  projectId: product_sanity_id,
  dataset: prod,
  apiVersion: apiVer,
  useCdn: false,
});
