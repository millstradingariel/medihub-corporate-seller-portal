const express = require("express");
const router = express.Router();
const PostageService = require("../services/Postage");
const service = new PostageService();

// ✅ This matches your frontend POST request
router.post("/", async (req, res) => {
  try {
    const { rate } = req.body;

    if (!rate?.destination?.postal_code || !rate?.items) {
      return res.status(400).json({
        error: "postal_code and items are required",
      });
    }

    const rates = await service.fetchPostageRates({
      zip: rate.destination.postal_code,
      items: rate.items,
    });

    res.json({ rates });

  } catch (err) {
    console.error("❌ Postage error:", err);
    res.status(500).json({
      error: "Failed to fetch postage rates",
      details: err.message,
    });
  }
});

module.exports = router;