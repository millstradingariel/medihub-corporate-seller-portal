import express from "express";
import { getSalesAnalytics } from "../../backend/services/analyticService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { period = "monthly" } = req.query;

  const now = new Date();
  let startDate;

  switch (period) {
    case "daily":
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case "weekly":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "monthly":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "yearly":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date("2000-01-01");
  }

  const data = await getSalesAnalytics(startDate, new Date());
  res.json(data);
});

export default router;
