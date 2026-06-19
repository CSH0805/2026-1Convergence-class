const pool = require('../config/db');

async function findByGoogleId(googleId) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  );
  return rows[0] || null;
}

async function createUser({ googleId, email, name, profileImage }) {
  const [result] = await pool.query(
    'INSERT INTO users (google_id, email, name, profile_image) VALUES (?, ?, ?, ?)',
    [googleId, email, name, profileImage]
  );
  return { id: result.insertId, googleId, email, name, profileImage };
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, email, name, profile_image, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findByGoogleId, createUser, findById };
