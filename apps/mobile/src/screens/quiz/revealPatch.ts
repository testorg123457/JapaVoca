/**
 * 늦게 도착한 서버 채점 응답을 지금 화면에 반영해도 되는지 판정한다.
 *
 * 낙관적 UI라서 화면은 응답보다 먼저 넘어간다. 응답이 오는 사이 사용자는 '다음'을
 * 눌렀을 수도, 세트를 새로 받았을 수도 있다. 그때 응답을 그대로 적용하면 엉뚱한
 * 문항에 "상자 +1"이 붙거나 정오 표시가 뒤집힌다.
 *
 * 커서만 비교하면 부족하다 — 세트를 새로 받으면 같은 인덱스에 다른 문제가 앉기
 * 때문에, 문항을 특정하는 question_token까지 같아야 한다.
 */
type RevealCandidate = {
  type: string;
  cursor?: number;
  set?: { questions: { question_token: string }[] };
};

/** 타입 술어로 둔다 — 호출부가 `phase`를 reveal 변형으로 좁혀 그대로 펼칠 수 있게. */
export function canApplyReveal<T extends RevealCandidate>(
  phase: T,
  cursor: number,
  token: string,
): phase is Extract<T, { type: 'reveal' }> {
  if (phase.type !== 'reveal' || phase.cursor !== cursor) { return false; }
  return phase.set?.questions[cursor]?.question_token === token;
}
