const { pool } = require("../db");

/* GET all companies */
const getCompanies = async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM company");
  res.json({ success: true, data: rows });
};

/* GET company by email */
const getCompanyByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    res.json({ data: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getCompanies,
  getCompanyByEmail,
};