const express = require("express");
const router = express.Router();
const client = require("../config/sanityClient");

const {
  getLocations,
  getLocationById,
} = require("../services/sanityLocationService");

const {
  getProductsByLocation,
} = require("../services/sanityProductService");

router.get("/", async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId required" });
    }

    const result = await client.fetch(
      `
      *[_type == "company" && companyid == $companyId][0]{
        locations[]->{
          _system,
          locationid,
          name,
          shippingAddress,
          shippingCity,
          shippingPostcode,
          shippingState
        }
      }
      `,
      { companyId }
    );

    const locations = (result?.locations || []).map(loc => ({
      _id: loc._system?.base?.id,
      location_id: loc.locationid,
      location_name: loc.name,
      address: loc.shippingAddress,
      city: loc.shippingCity,
      postcode: loc.shippingPostcode,
      state: loc.shippingState,
    }));

    res.json({
      success: true,
      data: locations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch locations" });
  }
});


router.get("/locations/:locationId", async (req, res) => {
  try {
    const location = await getLocationById(req.params.locationId);

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
})

router.get("/:locationid/products", async (req, res) => {
  const products = await getProductsByLocation(req.params.locationid);
  res.json(products);
});

module.exports = router;
