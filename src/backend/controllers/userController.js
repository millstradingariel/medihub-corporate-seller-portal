// backend/controllers/userController.js
const { pool } = require("../db");

const listUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE company_id = ?",
      [req.user.companyId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

const addUser = async (req, res) => {
  const { name, email, role, firebase_uid } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO users (company_id, name, email, role, firebase_uid, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [req.user.companyId, name, email, role, firebase_uid]
    );
    res.json({ id: result.insertId, name, email, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add user" });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ? AND company_id = ?",
      [name, email, role, id, req.user.companyId]
    );
    res.json({ id, name, email, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = ? AND company_id = ?", [id, req.user.companyId]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

module.exports = { listUsers, addUser, updateUser, deleteUser };
