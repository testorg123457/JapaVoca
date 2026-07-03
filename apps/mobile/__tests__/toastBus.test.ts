/**
 * toastBus — 전역 토스트 브리지(비-React 코드 ↔ ToastProvider) 단위 테스트.
 * React Query 등 컴포넌트 밖에서 토스트를 띄우기 위한 모듈 싱글턴.
 */
import {
  NETWORK_ERROR_MESSAGE,
  emitNetworkError,
  emitToast,
  setToastListener,
  type ToastPayload,
} from '../src/lib/toastBus';

describe('toastBus', () => {
  afterEach(() => setToastListener(null));

  it('emitToast는 등록된 리스너에 payload를 전달한다', () => {
    const received: ToastPayload[] = [];
    setToastListener((p) => received.push(p));

    emitToast('안녕');
    emitToast('오류', 'error');

    expect(received).toEqual([
      { message: '안녕', variant: 'info' },
      { message: '오류', variant: 'error' },
    ]);
  });

  it('emitNetworkError는 네트워크 메시지를 error variant로 보낸다', () => {
    const received: ToastPayload[] = [];
    setToastListener((p) => received.push(p));

    emitNetworkError();

    expect(received).toEqual([{ message: NETWORK_ERROR_MESSAGE, variant: 'error' }]);
  });

  it('리스너가 없으면(=null) 조용히 무시하고 예외를 던지지 않는다', () => {
    setToastListener(null);
    expect(() => emitToast('무시됨')).not.toThrow();
  });

  it('마지막에 등록된 리스너만 호출된다(단일 슬롯)', () => {
    const first: ToastPayload[] = [];
    const second: ToastPayload[] = [];
    setToastListener((p) => first.push(p));
    setToastListener((p) => second.push(p));

    emitToast('두번째로');

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);
  });
});
