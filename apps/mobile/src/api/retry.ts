/**
 * 네트워크 끊김 재시도 정책 — 판단만 하는 순수 함수(실제 재시도는 client.ts 인터셉터).
 *
 * ⚠️ 멱등한 GET만 재시도한다. 쓰기(POST/PATCH/DELETE)는 네트워크 오류일 때
 *    "서버에 안 닿은 것"인지 "닿았는데 응답만 유실된 것"인지 구분할 수 없어서,
 *    재시도하면 캐시 적립·상자 개봉·기프티콘 교환이 중복 실행될 수 있다.
 *    (CLAUDE.md 캐시 정합성) 퀴즈 답안은 재시도 대신 오프라인 큐로 처리한다.
 */

/** 재시도 간격(ms). 길이 = 최대 재시도 횟수. 합계 약 2.4초. */
export const NETWORK_RETRY_DELAYS_MS = [300, 700, 1400];

export type RetryDecisionInput = {
  /** 서버가 응답했는가(4xx/5xx 포함). true면 네트워크 끊김이 아니다. */
  hasResponse: boolean;
  /** 요청이 취소됐는가. 취소는 재시도 대상이 아니다. */
  isCancel: boolean;
  /**
   * 타임아웃으로 끊긴 요청인가.
   * ⚠️ 타임아웃은 재시도하지 않는다. 타임아웃도 응답이 없어 '끊김'으로 보이는데,
   *    재시도하면 대기가 (타임아웃 × 시도횟수)로 곱해져 사용자가 몇십 초를 기다린다.
   *    이미 한 번 기다려준 요청이므로 곧장 실패로 넘긴다.
   */
  isTimeout: boolean;
  /** HTTP 메서드. 없으면 axios 기본값인 get으로 본다. */
  method?: string;
  /** 지금까지 재시도한 횟수(0부터). */
  attempt: number;
  /** 호출부가 재시도를 원치 않는 경우(로컬 폴백이 있는 요청 등). */
  skip?: boolean;
};

export function shouldRetryNetworkError(input: RetryDecisionInput): boolean {
  if (input.skip || input.isCancel || input.isTimeout || input.hasResponse) { return false; }
  if ((input.method ?? 'get').toLowerCase() !== 'get') { return false; }
  return input.attempt < NETWORK_RETRY_DELAYS_MS.length;
}

export function networkRetryDelayMs(attempt: number): number {
  return NETWORK_RETRY_DELAYS_MS[attempt] ?? 0;
}
