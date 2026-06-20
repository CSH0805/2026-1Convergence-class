const pool = require('../config/db');

async function createPdf(sessionId, userId, filePath) {
  const [result] = await pool.query(
    'INSERT INTO pdfs (session_id, user_id, file_path) VALUES (?, ?, ?)',
    [sessionId, userId, filePath]
  );
  return result.insertId;
}

async function findPdfById(pdfId) {
  const [rows] = await pool.query(
    'SELECT * FROM pdfs WHERE id = ? LIMIT 1',
    [pdfId]
  );
  return rows[0] || null;
}

async function findPdfBySession(sessionId, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM pdfs WHERE session_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
    [sessionId, userId]
  );
  return rows[0] || null;
}

module.exports = { createPdf, findPdfById, findPdfBySession };
