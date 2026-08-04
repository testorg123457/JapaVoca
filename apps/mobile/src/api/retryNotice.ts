/**
 * 네트워크 재시도를 화면에 알리는 얇은 계층.
 *
 * 문제: 재시도(약 2.4초, `retry.ts`)는 이미 하고 있는데 **끝난 뒤에야** 토스트가 떠서,
 * 사용자에겐 "시도도 안 하고 바로 실패했다"로 보였다(피드백 체크리스트 E).
 * 그래서 재시도가 **시작될 때** 진행 중 토스트를 띄우고, 끝나면 결과로 교체한다.
 *
 * 동시에 여러 요청이 재시도할 수 있으므로 카운터로 묶는다 — 바가 껌뻑이지 않도록
 * 처음 하나가 시작할 때만 띄우고, 마지막 하나가 끝날 때만 결과를 낸다.
 *
 * ⚠️ begin/end 는 **재시도를 시작한 요청당 정확히 한 쌍**이어야 한다.
 *    (client.ts에서 attempt === 0인 최초 진입에서만 짝을 만든다.)
 * ⚠️ 순수 로직 — 테스트 있음(`__tests__/networkRetryNotice.test.ts`).
 */
import { dismissToast, emitNetworkError, emitNetworkRetrying } from '../lib/toastBus';

let active = 0;
let anyFailed = false;

/** 재시도를 시작한다. 첫 요청일 때만 진행 중 토스트를 띄운다. */
export function beginNetworkRetry(): void {
  if (active === 0) {
    anyFailed = false;
    emitNetworkRetrying();
  }
  active += 1;
}

/**
 * 재시도가 끝났다. 마지막 요청이 끝날 때만 결과를 낸다.
 *
 * 하나라도 실패했으면 실패로 본다 — 일부만 살아나도 화면엔 빈 자리가 남기 때문에
 * "연결됐다"고 말하면 거짓이 된다.
 */
export function endNetworkRetry(succeeded: boolean): void {
  if (active === 0) {
    return; // 짝이 안 맞는 호출(방어) — 상태를 흐트러뜨리지 않는다.
  }
  if (!succeeded) {
    anyFailed = true;
  }
  active -= 1;
  if (active > 0) {
    return;
  }
  if (anyFailed) {
    emitNetworkError();
  } else {
    dismissToast();
  }
}

/** 테스트용 — 모듈 싱글턴 상태를 초기화한다. */
export function resetNetworkRetryNotice(): void {
  active = 0;
  anyFailed = false;
}
