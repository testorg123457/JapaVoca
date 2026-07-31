import { canApplyReveal } from '../src/screens/quiz/revealPatch';

/** 판정에 필요한 최소 형태만 만든다. */
function reveal(cursor: number, tokens: string[]) {
  return {
    type: 'reveal' as const,
    cursor,
    set: { questions: tokens.map(t => ({ question_token: t })) },
  };
}

describe('늦게 도착한 채점 응답을 적용할지', () => {
  it('같은 문항의 결과를 아직 보고 있으면 적용한다', () => {
    expect(canApplyReveal(reveal(1, ['a', 'b', 'c']), 1, 'b')).toBe(true);
  });

  it('다음 문제로 넘어갔으면 버린다', () => {
    // 응답이 1번 문항 것인데 사용자는 이미 2번을 풀고 있다
    expect(canApplyReveal(reveal(2, ['a', 'b', 'c']), 1, 'b')).toBe(false);
  });

  it('reveal 단계가 아니면 버린다', () => {
    expect(canApplyReveal({ type: 'playing' }, 1, 'b')).toBe(false);
    expect(canApplyReveal({ type: 'loading' }, 1, 'b')).toBe(false);
    expect(canApplyReveal({ type: 'cooldown' }, 1, 'b')).toBe(false);
  });

  it('세트가 갈렸으면 버린다 — 커서가 같아도 다른 문항이다', () => {
    // 토큰까지 보는 이유: 세트를 새로 받으면 같은 인덱스에 다른 문제가 앉는다.
    // 커서만 비교하면 엉뚱한 문항에 "상자 +1"이 붙는다.
    expect(canApplyReveal(reveal(1, ['x', 'y', 'z']), 1, 'b')).toBe(false);
  });

  it('커서가 범위를 벗어나면 버린다', () => {
    expect(canApplyReveal(reveal(5, ['a', 'b']), 5, 'b')).toBe(false);
  });
});
