const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendPdfEmail({ toEmail, userName, pdfPath, sessionId }) {
  const mailOptions = {
    from: `"Calmmate 상담 시스템" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: '[Calmmate] 심리 상담 참고 자료가 도착했습니다',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2E7D6E; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Calmmate</h1>
          <p style="color: #B2DFDB; margin: 4px 0 0 0; font-size: 13px;">AI 심리 상담 시스템</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 28px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; color: #212121;">안녕하세요, <strong>${userName || '내담자'}</strong>님</p>
          <p style="font-size: 14px; color: #424242; line-height: 1.7;">
            Calmmate AI 상담이 완료되었습니다.<br>
            첨부된 PDF 파일에는 상담 전체 기록, 애착유형 진단 결과, 주요 키워드 분석이 포함되어 있습니다.<br>
            필요 시 담임선생님, Wee클래스 상담사, 정신건강 전문가에게 참고 자료로 제출하실 수 있습니다.
          </p>
          <div style="background-color: #E8F5F2; border-left: 4px solid #2E7D6E; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #1B5E50;">
              📎 첨부 파일: <strong>calmmate_report_${sessionId}.pdf</strong>
            </p>
          </div>
          <p style="font-size: 12px; color: #E65100; margin-top: 24px;">
            ⚠ 본 자료는 AI 분석 기반 참고 자료이며, 전문가의 진단 및 상담을 대체하지 않습니다.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `calmmate_report_${sessionId}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = { sendPdfEmail };
