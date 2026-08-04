/**
 * 상자 개봉 후 캐시 갱신 시점 — 회귀 테스트.
 *
 * 실제로 났던 버그: 개봉 중 나가기를 누르면 서버는 개봉을 커밋(200)했는데
 * 클라이언트는 응답 처리를 `if (!mountedRef.current) return`으로 걷어차서
 * `['boxes','unopened']`를 **한 번도 무효화하지 않았다**. 홈에 상자가 그대로 남고,
 * 다시 눌러 열면 서버가 409(이미 개봉됨)를 줬다. 캐시는 이미 지급된 뒤라 사용자에겐
 * "상자가 사라지지 않고 열리지도 않는" 상태로 보인다.
 */
import { planRefresh } from '../src/screens/quiz/boxOpenRefresh';

describe('planRefresh', () => {
  it('성공하면 갱신을 예약한다 — 화면이 살아있으면 애니메이션 뒤로 미룬다', () => {
    expect(planRefresh('opened', true)).toEqual({ markPending: true, flushNow: false });
  });

  it('화면을 떠난 뒤 응답이 와도 예약하고 즉시 흘린다 (이번 버그)', () => {
    expect(planRefresh('opened', false)).toEqual({ markPending: true, flushNow: true });
  });

  it('409(이미 개봉됨)도 갱신한다 — 목록에서 빠져야 한다', () => {
    expect(planRefresh('already-opened', true)).toEqual({ markPending: true, flushNow: false });
    expect(planRefresh('already-opened', false)).toEqual({ markPending: true, flushNow: true });
  });

  it('실패해도 갱신한다 — 서버는 커밋했는데 응답만 유실됐을 수 있다', () => {
    expect(planRefresh('failed', true)).toEqual({ markPending: true, flushNow: false });
    expect(planRefresh('failed', false)).toEqual({ markPending: true, flushNow: true });
  });

  it('어떤 결과든 갱신을 건너뛰지 않는다 — 건너뛰면 상자가 유령으로 남는다', () => {
    const outcomes = ['opened', 'already-opened', 'failed'] as const;
    for (const outcome of outcomes) {
      for (const mounted of [true, false]) {
        expect(planRefresh(outcome, mounted).markPending).toBe(true);
      }
    }
  });
});
