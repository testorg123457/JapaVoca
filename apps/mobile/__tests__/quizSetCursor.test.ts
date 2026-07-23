/**
 * 퀴즈 진행 커서 회귀 테스트.
 *
 * 버그(2026-07-23): 커서를 '다음' 버튼에서만 올려서, 답을 고른 뒤 결과 화면에서 앱을
 * 나갔다 돌아오면 이미 답한 문항이 다시 나왔다. 그걸 다시 제출하면 서버가 '이미 채점됨'
 * 으로 막아 정답/오답 표시 없이 다음으로 넘어갔다.
 */

// 전역 mock은 set/getNumber/remove가 없어서 이 테스트용으로 인메모리 구현을 쓴다.
jest.mock('react-native-mmkv', () => {
  const store: Record<string, string | number> = {};
  return {
    __esModule: true,
    createMMKV: () => ({
      getString: (k: string) => (typeof store[k] === 'string' ? store[k] : undefined),
      getNumber: (k: string) => (typeof store[k] === 'number' ? store[k] : undefined),
      set: (k: string, v: string | number) => { store[k] = v; },
      remove: (k: string) => { delete store[k]; },
      getAllKeys: () => Object.keys(store),
    }),
    MMKV: jest.fn(),
  };
});

import {
  clearCachedSet,
  getCachedSet,
  getCursor,
  markAnswered,
  setCachedSet,
  setCursor,
} from '../src/store/quizSet';

const makeSet = (n: number) => ({
  set_id: 1,
  cooldown_until: null,
  questions: Array.from({ length: n }, (_, i) => ({ order: i + 1, answered: false })),
}) as any;

describe('markAnswered', () => {
  beforeEach(() => {
    clearCachedSet();
    setCachedSet(makeSet(10));
    setCursor(0);
  });

  it('답한 즉시 커서가 다음 문항으로 넘어간다', () => {
    markAnswered(0);
    expect(getCursor()).toBe(1);
  });

  it('답한 문항은 캐시에서도 answered로 표시된다', () => {
    markAnswered(3);
    const set = getCachedSet();
    expect(set?.questions[3].answered).toBe(true);
    expect(set?.questions[4].answered).toBe(false);
  });

  it('결과 화면에서 나갔다 와도 답한 문항으로 되돌아가지 않는다', () => {
    markAnswered(0); // 답만 하고 '다음'은 안 누른 상태에서 이탈
    // 재진입: 저장된 커서로 재개
    expect(getCursor()).toBe(1);
    expect(getCachedSet()?.questions[0].answered).toBe(true);
  });

  it('커서를 뒤로 되돌리지 않는다 — 늦게 도착한 호출이 진행을 깎으면 안 된다', () => {
    setCursor(5);
    markAnswered(2);
    expect(getCursor()).toBe(5);
    expect(getCachedSet()?.questions[2].answered).toBe(true);
  });

  it('캐시된 세트가 없어도 죽지 않는다', () => {
    clearCachedSet();
    expect(() => markAnswered(0)).not.toThrow();
    expect(getCursor()).toBe(1);
  });

  it('범위 밖 인덱스여도 죽지 않는다', () => {
    expect(() => markAnswered(99)).not.toThrow();
  });
});
