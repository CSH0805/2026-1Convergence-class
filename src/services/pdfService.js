const PdfPrinter = require('pdfmake/src/printer');
const path = require('path');
const fs = require('fs');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

const printer = new PdfPrinter({
  NanumGothic: {
    normal:      path.join(FONTS_DIR, 'NanumGothic.ttf'),
    bold:        path.join(FONTS_DIR, 'NanumGothicBold.ttf'),
    italics:     path.join(FONTS_DIR, 'NanumGothic.ttf'),
    bolditalics: path.join(FONTS_DIR, 'NanumGothicBold.ttf'),
  },
});

const CHARACTER_NAMES = {
  dog:    '강아지 (외향적·활발)',
  cat:    '고양이 (차갑고 조용함)',
  quokka: '쿼카 (따뜻하고 다정함)',
  mouse:  '쥐 (호기심·내향적)',
};

const ATTACHMENT_LABELS = {
  avoidant:  '회피형 (Avoidant)',
  anxious:   '불안형 (Anxious)',
  secure:    '안정형 (Secure)',
  neglected: '방치형 (Neglected)',
};

const COLOR = {
  primary:    '#2E7D6E',
  light:      '#E8F5F2',
  headerBg:   '#1B5E50',
  border:     '#B2DFDB',
  text:       '#212121',
  subText:    '#546E7A',
  warning:    '#E65100',
  qBg:        '#F5F5F5',
  aBg:        '#FFFFFF',
};

function formatDate(date) {
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildKeywordRows(keywords) {
  const rows = [
    [
      { text: '출발 키워드', style: 'tableHeader' },
      { text: '연결 키워드', style: 'tableHeader' },
    ],
  ];
  for (const k of keywords) {
    rows.push([
      { text: k.keyword, font: 'NanumGothic' },
      { text: k.related_keyword || '(독립 키워드)', color: k.related_keyword ? COLOR.text : COLOR.subText, font: 'NanumGothic' },
    ]);
  }
  return rows;
}

function buildConversationContent(messages) {
  const items = [];
  for (const m of messages) {
    items.push(
      {
        table: {
          widths: [30, '*'],
          body: [
            [
              { text: `Q${m.question_number}`, style: 'qLabel', fillColor: COLOR.primary },
              { text: m.ai_message, font: 'NanumGothic', fontSize: 10, color: COLOR.text, fillColor: COLOR.qBg, margin: [6, 4, 6, 4] },
            ],
            [
              { text: `A${m.question_number}`, style: 'aLabel', fillColor: COLOR.border },
              { text: m.user_answer || '(미응답)', font: 'NanumGothic', fontSize: 10, color: COLOR.text, fillColor: COLOR.aBg, margin: [6, 4, 6, 4] },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => COLOR.border,
        },
        margin: [0, 0, 0, 8],
      }
    );
  }
  return items;
}

function buildDocDefinition({ session, user, diagnosis, keywords, messages }) {
  const sessionDate = formatDate(session.created_at);
  const docId = `CALM-${session.id.toString().padStart(4, '0')}`;

  return {
    defaultStyle: { font: 'NanumGothic', fontSize: 10, color: COLOR.text, lineHeight: 1.4 },
    pageSize: 'A4',
    pageMargins: [50, 60, 50, 60],

    header: (page, pages) => ({
      columns: [
        { text: 'Calmmate AI 상담 시스템', font: 'NanumGothic', fontSize: 8, color: '#FFFFFF', margin: [50, 18, 0, 0] },
        { text: `${page} / ${pages}`, font: 'NanumGothic', fontSize: 8, color: '#FFFFFF', alignment: 'right', margin: [0, 18, 50, 0] },
      ],
      fillColor: COLOR.headerBg,
      margin: [0, 0, 0, 10],
    }),

    footer: {
      columns: [
        {
          text: '⚠ 본 자료는 AI 분석 기반 참고 자료이며, 전문가의 진단 및 상담을 대체하지 않습니다.',
          font: 'NanumGothic', fontSize: 8, color: COLOR.warning,
          margin: [50, 10, 50, 0],
        },
      ],
    },

    content: [
      // ── 제목 ──────────────────────────────────────────────────────
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 495, h: 70, r: 4, color: COLOR.primary }],
        margin: [0, 0, 0, 0],
      },
      {
        stack: [
          { text: '심리 상담 참고 자료', font: 'NanumGothic', fontSize: 20, bold: true, color: '#FFFFFF' },
          { text: 'Calmmate AI 상담 시스템 — 전문가 참고용', font: 'NanumGothic', fontSize: 10, color: '#B2DFDB', margin: [0, 4, 0, 0] },
        ],
        absolutePosition: { x: 65, y: 75 },
      },
      { text: '', margin: [0, 45, 0, 0] },

      // 문서 메타
      {
        columns: [
          { text: `문서번호: ${docId}`, font: 'NanumGothic', fontSize: 9, color: COLOR.subText },
          { text: `생성일시: ${sessionDate}`, font: 'NanumGothic', fontSize: 9, color: COLOR.subText, alignment: 'right' },
        ],
        margin: [0, 0, 0, 16],
      },

      // ── 1. 상담 개요 ──────────────────────────────────────────────
      { text: '1.  상담 개요', style: 'sectionTitle' },
      {
        table: {
          widths: [120, '*'],
          body: [
            [{ text: '항목', style: 'tableHeader' }, { text: '내용', style: 'tableHeader' }],
            [{ text: '상담자 이름', style: 'tableKey' }, { text: user.name || '(정보 없음)', font: 'NanumGothic' }],
            [{ text: '이메일', style: 'tableKey' }, { text: user.email, font: 'NanumGothic' }],
            [{ text: 'AI 상담 캐릭터', style: 'tableKey' }, { text: CHARACTER_NAMES[session.character] || session.character, font: 'NanumGothic' }],
            [{ text: '상담 일시', style: 'tableKey' }, { text: sessionDate, font: 'NanumGothic' }],
            [{ text: '총 문항 수', style: 'tableKey' }, { text: `${messages.length}문항`, font: 'NanumGothic' }],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 20],
      },

      // ── 2. 애착유형 진단 결과 ─────────────────────────────────────
      { text: '2.  애착유형 진단 결과', style: 'sectionTitle' },
      {
        table: {
          widths: [120, '*'],
          body: [
            [{ text: '항목', style: 'tableHeader' }, { text: '내용', style: 'tableHeader' }],
            [
              { text: '진단 유형', style: 'tableKey' },
              {
                text: ATTACHMENT_LABELS[diagnosis.attachment_type] || diagnosis.attachment_type,
                font: 'NanumGothic', bold: true, color: COLOR.primary, fontSize: 12,
              },
            ],
            [
              { text: '진단 근거', style: 'tableKey' },
              { text: diagnosis.reasoning, font: 'NanumGothic', lineHeight: 1.6 },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 20],
      },

      // ── 3. 주요 키워드 ────────────────────────────────────────────
      { text: '3.  주요 키워드 (마인드맵 구조)', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', '*'],
          body: buildKeywordRows(keywords),
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 20],
      },

      // ── 4. 상담 전체 기록 ─────────────────────────────────────────
      { text: '4.  상담 전체 기록', style: 'sectionTitle' },
      ...buildConversationContent(messages),
    ],

    styles: {
      sectionTitle: {
        font: 'NanumGothic', fontSize: 13, bold: true,
        color: COLOR.headerBg, margin: [0, 8, 0, 6],
        decoration: 'underline', decorationColor: COLOR.primary,
      },
      tableHeader: {
        font: 'NanumGothic', bold: true, fontSize: 10,
        color: '#FFFFFF', fillColor: COLOR.primary,
        margin: [6, 5, 6, 5],
      },
      tableKey: {
        font: 'NanumGothic', bold: true, fontSize: 10,
        color: COLOR.headerBg, fillColor: COLOR.light,
        margin: [6, 5, 6, 5],
      },
      qLabel: {
        font: 'NanumGothic', bold: true, fontSize: 10,
        color: '#FFFFFF', alignment: 'center',
        margin: [0, 4, 0, 4],
      },
      aLabel: {
        font: 'NanumGothic', bold: true, fontSize: 10,
        color: COLOR.headerBg, alignment: 'center',
        margin: [0, 4, 0, 4],
      },
    },
  };
}

function generatePdf(data, outputPath) {
  return new Promise((resolve, reject) => {
    const docDefinition = buildDocDefinition(data);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const writeStream = fs.createWriteStream(outputPath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

module.exports = { generatePdf };
