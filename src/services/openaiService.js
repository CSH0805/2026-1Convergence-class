const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 캐릭터 페르소나로 다음 질문 생성
async function getNextQuestion(systemPrompt, conversationHistory) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ],
    max_tokens: 300,
    temperature: 0.8,
  });
  return response.choices[0].message.content.trim();
}

// 전체 대화 분석 → 애착유형 + 키워드 JSON 반환
async function getDiagnosis(diagnosisPrompt) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '당신은 청소년 심리 분석 전문가입니다. 요청받은 형식의 JSON으로만 응답합니다.',
      },
      { role: 'user', content: diagnosisPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.3,
  });
  return JSON.parse(response.choices[0].message.content);
}

module.exports = { getNextQuestion, getDiagnosis };
