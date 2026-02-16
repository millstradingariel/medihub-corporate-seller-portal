import express from "express";
import dashboardRoute from "./routes/dashboard1";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use("/api", dashboardRoute);

app.listen(process.env.PORT, () => {
  console.log(`Backend running on port ${process.env.PORT}`);
});
