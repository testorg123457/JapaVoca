/**
 * retryNotice — 재시도 시작/종료를 토스트로 알리는 카운터.
 *
 * 핵심은 **동시에 여러 요청이 재시도해도 바가 껌뻑이지 않는 것**: 처음 하나가 시작할
 * 때만 "재시도 중"을 띄우고, 마지막 하나가 끝날 때만 결과를 낸다.
 */
import {
  beginNetworkRetry,
  endNetworkRetry,
  resetNetworkRetryNotice,
} from '../src/api/retryNotice';
import {
  NETWORK_ERROR_MESSAGE,
  NETWORK_RETRYING_MESSAGE,
  setNetworkRetryAction,
  setToastListener,
  type ToastPayload,
} from '../src/lib/toastBus';

type Received = ToastPayload | null;
let received: Received[];

/** null(=지움)은 null로, 토스트는 메시지만 뽑아 흐름을 읽기 쉽게. */
const flow = () => received.map((p) => (p === null ? null : p.message));

beforeEach(() => {
  received = [];
  resetNetworkRetryNotice();
  setNetworkRetryAction(null);
  setToastListener((p) => received.push(p));
});

afterEach(() => {
  setToastListener(null);
  resetNetworkRetryNotice();
});

describe('retryNotice', () => {
  it('재시도가 시작되면 진행 중 토스트를 띄운다', () => {
    beginNetworkRetry();
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE]);
  });

  it('성공으로 끝나면 조용히 지운다 — 잘 된 걸 알릴 필요는 없다', () => {
    beginNetworkRetry();
    endNetworkRetry(true);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE, null]);
  });

  it('실패로 끝나면 연결 안 됨으로 교체한다', () => {
    beginNetworkRetry();
    endNetworkRetry(false);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE, NETWORK_ERROR_MESSAGE]);
  });

  it('여러 요청이 겹쳐도 진행 중 토스트는 한 번만 뜬다', () => {
    beginNetworkRetry();
    beginNetworkRetry();
    beginNetworkRetry();
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE]);

    endNetworkRetry(true);
    endNetworkRetry(true);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE]); // 아직 남은 요청이 있다

    endNetworkRetry(true);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE, null]);
  });

  it('하나라도 실패하면 실패로 본다 — 화면엔 빈 자리가 남기 때문', () => {
    beginNetworkRetry();
    beginNetworkRetry();
    endNetworkRetry(false);
    endNetworkRetry(true);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE, NETWORK_ERROR_MESSAGE]);
  });

  it('다음 사이클은 이전 실패를 물려받지 않는다', () => {
    beginNetworkRetry();
    endNetworkRetry(false);
    received = [];

    beginNetworkRetry();
    endNetworkRetry(true);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE, null]);
  });

  it('짝이 안 맞는 end는 무시한다(상태를 흐트러뜨리지 않는다)', () => {
    endNetworkRetry(false);
    expect(flow()).toEqual([]);

    beginNetworkRetry();
    endNetworkRetry(true);
    expect(flow()).toEqual([NETWORK_RETRYING_MESSAGE, null]);
  });
});
