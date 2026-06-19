const pool = require('../config/db');

async function createSession(userId, character) {
  const [result] = await pool.query(
    'INSERT INTO counseling_sessions (user_id, `character`) VALUES (?, ?)',
    [userId, character]
  );
  return result.insertId;
}

async function findSessionById(sessionId) {
  const [rows] = await pool.query(
    'SELECT * FROM counseling_sessions WHERE id = ? LIMIT 1',
    [sessionId]
  );
  return rows[0] || null;
}

async function saveAiMessage(sessionId, questionNumber, aiMessage) {
  await pool.query(
    'INSERT INTO counseling_messages (session_id, question_number, ai_message) VALUES (?, ?, ?)',
    [sessionId, questionNumber, aiMessage]
  );
}

async function saveUserAnswer(sessionId, questionNumber, userAnswer) {
  await pool.query(
    'UPDATE counseling_messages SET user_answer = ? WHERE session_id = ? AND question_number = ?',
    [userAnswer, sessionId, questionNumber]
  );
}

async function getMessages(sessionId) {
  const [rows] = await pool.query(
    'SELECT question_number, ai_message, user_answer FROM counseling_messages WHERE session_id = ? ORDER BY question_number ASC',
    [sessionId]
  );
  return rows;
}

async function getCurrentQuestionNumber(sessionId) {
  const [rows] = await pool.query(
    'SELECT MAX(question_number) AS current FROM counseling_messages WHERE session_id = ?',
    [sessionId]
  );
  return rows[0].current || 0;
}

async function saveDiagnosis(sessionId, attachmentType, reasoning) {
  await pool.query(
    'INSERT INTO diagnoses (session_id, attachment_type, reasoning) VALUES (?, ?, ?)',
    [sessionId, attachmentType, reasoning]
  );
}

async function saveKeywords(sessionId, keywords) {
  if (!keywords || keywords.length === 0) return;
  const values = keywords.map(k => [sessionId, k.keyword, k.related_keyword || null]);
  await pool.query('INSERT INTO keywords (session_id, keyword, related_keyword) VALUES ?', [values]);
}

async function completeSession(sessionId) {
  await pool.query(
    "UPDATE counseling_sessions SET status = 'completed', completed_at = NOW() WHERE id = ?",
    [sessionId]
  );
}

async function getResult(sessionId) {
  const [[session]] = await pool.query(
    'SELECT * FROM counseling_sessions WHERE id = ? LIMIT 1',
    [sessionId]
  );
  const [[diagnosis]] = await pool.query(
    'SELECT attachment_type, reasoning FROM diagnoses WHERE session_id = ? LIMIT 1',
    [sessionId]
  );
  const [messages] = await pool.query(
    'SELECT question_number, ai_message, user_answer FROM counseling_messages WHERE session_id = ? ORDER BY question_number',
    [sessionId]
  );
  const [keywords] = await pool.query(
    'SELECT keyword, related_keyword FROM keywords WHERE session_id = ?',
    [sessionId]
  );
  return { session, diagnosis, messages, keywords };
}

module.exports = {
  createSession,
  findSessionById,
  saveAiMessage,
  saveUserAnswer,
  getMessages,
  getCurrentQuestionNumber,
  saveDiagnosis,
  saveKeywords,
  completeSession,
  getResult,
};
