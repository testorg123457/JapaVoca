/**
 * toastBus — 전역 토스트 브리지(비-React 코드 ↔ ToastProvider) 단위 테스트.
 * React Query 등 컴포넌트 밖에서 토스트를 띄우기 위한 모듈 싱글턴.
 */
import {
  NETWORK_ERROR_MESSAGE,
  NETWORK_RETRYING_MESSAGE,
  TOAST_ACTION_DURATION_MS,
  dismissToast,
  emitNetworkError,
  emitNetworkRetrying,
  emitToast,
  setNetworkRetryAction,
  setToastListener,
  type ToastPayload,
} from '../src/lib/toastBus';

type Received = ToastPayload | null;

describe('toastBus', () => {
  afterEach(() => {
    setToastListener(null);
    setNetworkRetryAction(null);
  });

  it('emitToast는 등록된 리스너에 payload를 전달한다', () => {
    const received: Received[] = [];
    setToastListener((p) => received.push(p));

    emitToast('안녕');
    emitToast('오류', 'error');

    expect(received).toEqual([
      { message: '안녕', variant: 'info' },
      { message: '오류', variant: 'error' },
    ]);
  });

  it('emitNetworkError는 네트워크 메시지를 error variant로 보낸다', () => {
    const received: Received[] = [];
    setToastListener((p) => received.push(p));

    emitNetworkError();

    expect(received[0]).toMatchObject({ message: NETWORK_ERROR_MESSAGE, variant: 'error' });
  });

  it('재시도 액션이 등록돼 있으면 "다시 시도"를 붙이고 더 오래 띄운다', () => {
    const received: Received[] = [];
    setToastListener((p) => received.push(p));
    const retry = jest.fn();
    setNetworkRetryAction(retry);

    emitNetworkError();

    const payload = received[0] as ToastPayload;
    expect(payload.action?.label).toBe('다시 시도');
    expect(payload.duration).toBe(TOAST_ACTION_DURATION_MS);
    payload.action?.onPress();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('액션이 없으면 액션 없이 기본 시간으로 띄운다', () => {
    const received: Received[] = [];
    setToastListener((p) => received.push(p));

    emitNetworkError();

    expect((received[0] as ToastPayload).action).toBeUndefined();
  });

  it('재시도 중 토스트는 스스로 사라지지 않는다(duration null)', () => {
    const received: Received[] = [];
    setToastListener((p) => received.push(p));

    emitNetworkRetrying();

    expect(received[0]).toEqual({
      message: NETWORK_RETRYING_MESSAGE,
      variant: 'retrying',
      duration: null,
    });
  });

  it('dismissToast는 null을 보내 바를 지운다', () => {
    const received: Received[] = [];
    setToastListener((p) => received.push(p));

    dismissToast();

    expect(received).toEqual([null]);
  });

  it('리스너가 없으면(=null) 조용히 무시하고 예외를 던지지 않는다', () => {
    setToastListener(null);
    expect(() => emitToast('무시됨')).not.toThrow();
    expect(() => dismissToast()).not.toThrow();
  });

  it('마지막에 등록된 리스너만 호출된다(단일 슬롯)', () => {
    const first: Received[] = [];
    const second: Received[] = [];
    setToastListener((p) => first.push(p));
    setToastListener((p) => second.push(p));

    emitToast('두번째로');

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);
  });
});
