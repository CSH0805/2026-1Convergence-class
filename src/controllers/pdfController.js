const path = require('path');
const fs = require('fs');
const counselingModel = require('../models/counselingModel');
const pdfModel = require('../models/pdfModel');
const userModel = require('../models/userModel');
const { generatePdf } = require('../services/pdfService');
const { sendPdfEmail } = require('../services/emailService');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/pdfs');

// POST /counseling/:sessionId/generate-pdf
exports.generatePdf = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { session, diagnosis, keywords, messages } = await counselingModel.getResult(sessionId);
    if (!session) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    if (session.user_id !== req.user.id) return res.status(403).json({ error: '권한이 없습니다.' });
    if (session.status !== 'completed') return res.status(400).json({ error: '완료된 세션만 PDF를 생성할 수 있습니다.' });
    if (!diagnosis) return res.status(400).json({ error: '진단 결과가 없습니다.' });

    const user = await userModel.findById(req.user.id);

    // 저장 경로
    const userDir = path.join(UPLOADS_DIR, String(req.user.id));
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    const fileName = `session_${sessionId}_${Date.now()}.pdf`;
    const filePath = path.join(userDir, fileName);

    await generatePdf({ session, user, diagnosis, keywords, messages }, filePath);

    const pdfId = await pdfModel.createPdf(sessionId, req.user.id, filePath);

    return res.status(201).json({
      pdfId,
      pdfUrl: `/pdfs/${pdfId}/download`,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[generatePdf 오류]', err.message);
    return res.status(500).json({ error: 'PDF 생성 중 오류가 발생했습니다.' });
  }
};

// GET /pdfs/:pdfId/download
exports.downloadPdf = async (req, res) => {
  const { pdfId } = req.params;

  try {
    const pdf = await pdfModel.findPdfById(pdfId);
    if (!pdf) return res.status(404).json({ error: 'PDF를 찾을 수 없습니다.' });
    if (pdf.user_id !== req.user.id) return res.status(403).json({ error: '권한이 없습니다.' });
    if (!fs.existsSync(pdf.file_path)) return res.status(404).json({ error: 'PDF 파일이 존재하지 않습니다.' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="calmmate_report_${pdf.session_id}.pdf"`);
    fs.createReadStream(pdf.file_path).pipe(res);
  } catch (err) {
    console.error('[downloadPdf 오류]', err.message);
    return res.status(500).json({ error: '다운로드 중 오류가 발생했습니다.' });
  }
};

// POST /pdfs/:pdfId/send-email
exports.sendEmail = async (req, res) => {
  const { pdfId } = req.params;
  const { toEmail } = req.body;

  try {
    const pdf = await pdfModel.findPdfById(pdfId);
    if (!pdf) return res.status(404).json({ error: 'PDF를 찾을 수 없습니다.' });
    if (pdf.user_id !== req.user.id) return res.status(403).json({ error: '권한이 없습니다.' });
    if (!fs.existsSync(pdf.file_path)) return res.status(404).json({ error: 'PDF 파일이 존재하지 않습니다.' });

    const user = await userModel.findById(req.user.id);
    const targetEmail = toEmail || user.email;

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: '유효한 이메일 주소를 입력해주세요.' });
    }

    await sendPdfEmail({
      toEmail: targetEmail,
      userName: user.name,
      pdfPath: pdf.file_path,
      sessionId: pdf.session_id,
    });

    return res.json({ success: true, sentTo: targetEmail });
  } catch (err) {
    console.error('[sendEmail 오류]', err.message);
    return res.status(500).json({ error: '이메일 발송 중 오류가 발생했습니다.' });
  }
};
