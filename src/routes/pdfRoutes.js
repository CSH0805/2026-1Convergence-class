const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const pdfController = require('../controllers/pdfController');

router.use(authMiddleware);

// PDF 생성 (상담 세션 기반)
router.post('/counseling/:sessionId/generate-pdf', pdfController.generatePdf);

// PDF 다운로드
router.get('/pdfs/:pdfId/download', pdfController.downloadPdf);

// PDF 이메일 발송
router.post('/pdfs/:pdfId/send-email', pdfController.sendEmail);

module.exports = router;
