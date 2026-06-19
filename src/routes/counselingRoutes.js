const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const counselingController = require('../controllers/counselingController');

// 모든 상담 API는 JWT 인증 필수
router.use(authMiddleware);

// POST /counseling/start — 캐릭터 선택 + 세션 생성 + 첫 질문
router.post('/start', counselingController.startCounseling);

// POST /counseling/:sessionId/answer — 답변 제출 + 다음 질문 or 진단
router.post('/:sessionId/answer', counselingController.submitAnswer);

// GET /counseling/:sessionId/result — 완료된 세션 결과 조회
router.get('/:sessionId/result', counselingController.getResult);

module.exports = router;
