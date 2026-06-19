function buildDiagnosisPrompt(messages) {
  const conversation = messages
    .map(m => `[질문 ${m.question_number}] ${m.ai_message}\n[답변 ${m.question_number}] ${m.user_answer}`)
    .join('\n\n');

  return `다음은 청소년과 나눈 상담 대화 전문입니다:

${conversation}

위 대화를 심층 분석하여 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

{
  "attachment_type": "avoidant" 또는 "anxious" 또는 "secure" 또는 "neglected",
  "reasoning": "이 유형으로 판단한 구체적인 근거를 대화 내용을 인용하며 3~4문장으로 설명",
  "keywords": [
    { "keyword": "출발_노드_키워드", "related_keyword": "연결_노드_키워드_또는_null" }
  ]
}

[애착유형 판단 기준]
- avoidant(회피형): 감정 표현 회피, 타인과의 거리 유지, 독립 강조, 도움 요청 꺼림
- anxious(불안형): 버림받음에 대한 두려움, 관계에서 과도한 확인 추구, 감정 기복 큼
- secure(안정형): 감정 표현이 자연스럽고 편안함, 의존과 독립의 건강한 균형
- neglected(방치형): 관계에 대한 무관심 또는 단절, 감정 자체를 인식하거나 표현하기 어려움

[키워드 추출 규칙]
- 대화에서 핵심 감정, 상황, 관계, 행동 패턴을 나타내는 키워드를 10~15개 추출
- keyword(출발 노드)와 related_keyword(도착 노드)는 마인드맵의 연결 관계를 나타냄
- 독립적인 핵심 키워드는 related_keyword를 null로 설정
- 예시: {"keyword": "스트레스", "related_keyword": "학교"}, {"keyword": "외로움", "related_keyword": null}`;
}

module.exports = { buildDiagnosisPrompt };
