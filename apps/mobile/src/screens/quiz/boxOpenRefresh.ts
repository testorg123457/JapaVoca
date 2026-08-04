/**
 * 상자 개봉 후 캐시(지갑·상자 목록·데일리) 갱신 시점 판단 — 순수함수.
 *
 * ⚠️ **어떤 결과든 갱신을 건너뛰지 않는다.** 개봉 요청이 서버에 닿은 이상 서버는
 *    커밋했을 수 있고(성공·409는 확실히, 네트워크 실패도 응답만 유실됐을 수 있다),
 *    그런데 클라이언트가 목록을 무효화하지 않으면 **이미 열린 상자가 홈에 유령으로 남는다.**
 *    그 상자를 다시 누르면 409만 돌아온다 — 캐시는 이미 들어갔는데 사용자에겐
 *    "열리지도 사라지지도 않는 상자"로 보인다.
 *
 * 실제로 났던 버그: 개봉 중 나가기를 누르면 응답 처리가 `if (!mountedRef.current) return`에
 * 걸려 갱신 예약(`pendingRefreshRef = true`) 자체를 못 하고 끝났다. 화면이 사라졌다는 건
 * **갱신을 건너뛸 이유가 아니라 더 급히 흘릴 이유**다(미룰 애니메이션이 없으므로).
 *
 * 갱신을 애니메이션 뒤로 미루는 건 프레임 드랍 때문이다(보상이 뜨는 순간 invalidate를
 * 돌리면 홈 쿼리 재요청·리렌더가 JS 스레드를 잡는다). 화면이 없으면 미룰 이유도 없다.
 */
export type OpenOutcome =
  /** 서버가 개봉을 확정하고 보상을 내려줬다. */
  | 'opened'
  /** 409 — 이미 열린 상자. 보상은 이미 지급된 상태. */
  | 'already-opened'
  /** 그 외 실패(네트워크·타임아웃 등). 서버 처리 여부는 알 수 없다. */
  | 'failed';

export interface RefreshPlan {
  /** 갱신을 예약할지. 항상 true — 위 주석 참고. */
  markPending: boolean;
  /** 지금 당장 흘릴지. 화면이 없으면 기다릴 애니메이션도 없다. */
  flushNow: boolean;
}

export function planRefresh(_outcome: OpenOutcome, mounted: boolean): RefreshPlan {
  return { markPending: true, flushNow: !mounted };
}
