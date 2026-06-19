const CHARACTER_PROMPTS = require('../prompts/characters');
const { buildDiagnosisPrompt } = require('../prompts/diagnosis');
const openaiService = require('../services/openaiService');
const counselingModel = require('../models/counselingModel');

const VALID_CHARACTERS = ['dog', 'cat', 'quokka', 'mouse'];
const TOTAL_QUESTIONS = 10;

// 대화 DB 레코드 → OpenAI messages 배열로 변환
function buildChatHistory(messages) {
  const history = [];
  for (const msg of messages) {
    if (msg.ai_message) history.push({ role: 'assistant', content: msg.ai_message });
    if (msg.user_answer) history.push({ role: 'user', content: msg.user_answer });
  }
  return history;
}

// POST /counseling/start
exports.startCounseling = async (req, res) => {
  const { character } = req.body;
  if (!VALID_CHARACTERS.includes(character)) {
    return res.status(400).json({ error: '유효하지 않은 캐릭터입니다. (dog/cat/quokka/mouse)' });
  }

  try {
    const sessionId = await counselingModel.createSession(req.user.id, character);
    const systemPrompt = CHARACTER_PROMPTS[character];

    const firstQuestion = await openaiService.getNextQuestion(systemPrompt, [
      { role: 'user', content: '안녕하세요, 상담을 시작해 주세요.' },
    ]);

    await counselingModel.saveAiMessage(sessionId, 1, firstQuestion);

    return res.status(201).json({
      sessionId,
      questionNumber: 1,
      aiMessage: firstQuestion,
    });
  } catch (err) {
    console.error('[startCounseling 오류]', err.message);
    return res.status(500).json({ error: '상담 시작 중 오류가 발생했습니다.' });
  }
};

// POST /counseling/:sessionId/answer
exports.submitAnswer = async (req, res) => {
  const { sessionId } = req.params;
  const { answer } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({ error: '답변을 입력해주세요.' });
  }

  // 세션 유효성 검사
  let session;
  try {
    session = await counselingModel.findSessionById(sessionId);
  } catch (err) {
    console.error('[DB 오류]', err.message);
    return res.status(500).json({ error: 'DB 오류가 발생했습니다.' });
  }

  if (!session) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  if (session.user_id !== req.user.id) return res.status(403).json({ error: '권한이 없습니다.' });
  if (session.status === 'completed') return res.status(400).json({ error: '이미 완료된 세션입니다.' });

  try {
    const currentQ = await counselingModel.getCurrentQuestionNumber(sessionId);
    await counselingModel.saveUserAnswer(sessionId, currentQ, answer.trim());

    // 10번째 답변 → 진단 + 키워드 추출
    if (currentQ === TOTAL_QUESTIONS) {
      const messages = await counselingModel.getMessages(sessionId);
      const diagnosisPrompt = buildDiagnosisPrompt(messages);
      const result = await openaiService.getDiagnosis(diagnosisPrompt);

      await counselingModel.saveDiagnosis(sessionId, result.attachment_type, result.reasoning);
      await counselingModel.saveKeywords(sessionId, result.keywords || []);
      await counselingModel.completeSession(sessionId);

      return res.json({
        completed: true,
        diagnosis: {
          type: result.attachment_type,
          reasoning: result.reasoning,
        },
        keywords: result.keywords || [],
      });
    }

    // 1~9번째 답변 → 다음 질문 생성
    const messages = await counselingModel.getMessages(sessionId);
    const history = buildChatHistory(messages); // 저장된 답변 포함
    const nextQuestion = await openaiService.getNextQuestion(
      CHARACTER_PROMPTS[session.character],
      history
    );

    await counselingModel.saveAiMessage(sessionId, currentQ + 1, nextQuestion);

    return res.json({
      questionNumber: currentQ + 1,
      aiMessage: nextQuestion,
    });
  } catch (err) {
    console.error('[submitAnswer 오류]', err.message);
    return res.status(500).json({ error: '답변 처리 중 오류가 발생했습니다.' });
  }
};

// GET /counseling/:sessionId/result
exports.getResult = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const { session, diagnosis, messages, keywords } = await counselingModel.getResult(sessionId);
    if (!session) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    if (session.user_id !== req.user.id) return res.status(403).json({ error: '권한이 없습니다.' });
    if (session.status !== 'completed') return res.status(400).json({ error: '아직 완료되지 않은 세션입니다.' });

    return res.json({
      character: session.character,
      diagnosis: {
        type: diagnosis.attachment_type,
        reasoning: diagnosis.reasoning,
      },
      keywords,
      conversation: messages,
    });
  } catch (err) {
    console.error('[getResult 오류]', err.message);
    return res.status(500).json({ error: '결과 조회 중 오류가 발생했습니다.' });
  }
};
