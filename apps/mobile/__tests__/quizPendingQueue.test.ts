/**
 * 오프라인 답안 큐 회귀 테스트.
 *
 * 버그: 동기화에 성공하면 큐를 통째로 비웠다. 전송이 오가는 동안 사용자가 새로 푼 답이
 * 큐에 쌓이면 그 답은 서버에 닿지도 못한 채 같이 지워졌다. 보낸 것만 빼야 한다.
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
  addPendingAnswer,
  getPendingAnswers,
  removePendingAnswers,
  type PendingAnswer,
} from '../src/store/quizSet';

const answer = (token: string): PendingAnswer => ({
  question_token: token,
  choice_index: 0,
  answer_ms: 1000,
  answered_at: '2026-07-28T00:00:00.000Z',
});

describe('removePendingAnswers', () => {
  beforeEach(() => {
    removePendingAnswers(getPendingAnswers().map(a => a.question_token));
  });

  it('보낸 답안만 큐에서 빠진다', () => {
    addPendingAnswer(answer('a'));
    addPendingAnswer(answer('b'));

    removePendingAnswers(['a']);

    expect(getPendingAnswers().map(a => a.question_token)).toEqual(['b']);
  });

  it('전송 중에 새로 쌓인 답안은 지워지지 않는다', () => {
    addPendingAnswer(answer('a'));
    const sending = getPendingAnswers().map(a => a.question_token); // 전송 시작 시점 스냅샷

    addPendingAnswer(answer('b')); // 전송이 오가는 동안 새로 푼 답

    removePendingAnswers(sending);

    expect(getPendingAnswers().map(a => a.question_token)).toEqual(['b']);
  });

  it('전부 보냈으면 큐가 빈다', () => {
    addPendingAnswer(answer('a'));
    addPendingAnswer(answer('b'));

    removePendingAnswers(['a', 'b']);

    expect(getPendingAnswers()).toEqual([]);
  });

  it('큐에 없는 토큰을 빼도 죽지 않는다', () => {
    addPendingAnswer(answer('a'));

    expect(() => removePendingAnswers(['없는토큰'])).not.toThrow();
    expect(getPendingAnswers().map(a => a.question_token)).toEqual(['a']);
  });
});
