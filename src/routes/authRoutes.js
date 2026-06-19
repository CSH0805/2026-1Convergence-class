const router = require('express').Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /auth/google  — 구글 ID Token으로 로그인
router.post('/google', authController.googleLogin);

// GET /auth/me  — 현재 로그인 유저 정보 (JWT 필요)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
