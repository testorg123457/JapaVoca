/**
 * toastBus — 전역 토스트 브리지.
 *
 * ToastProvider(React)와 컴포넌트 밖 코드(React Query 캐시 onError, axios 등)를
 * 잇는 모듈 싱글턴. Provider가 마운트되며 리스너를 등록하고, 어디서든 emitToast()/
 * emitNetworkError()를 호출하면 화면에 토스트가 뜬다.
 *
 * 앱 트리에는 ToastProvider가 하나뿐이므로 리스너 슬롯도 하나(단일 슬롯)다.
 */
export type ToastVariant = 'info' | 'error';
export interface ToastPayload {
  message: string;
  variant: ToastVariant;
}

/** 네트워크 끊김 공용 메시지 — 화면마다 다르게 쓰지 않는다. */
export const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요';

type Listener = (payload: ToastPayload) => void;
let listener: Listener | null = null;

/** ToastProvider가 마운트/언마운트 시 자신을 등록/해제(null)한다. */
export function setToastListener(fn: Listener | null): void {
  listener = fn;
}

export function emitToast(message: string, variant: ToastVariant = 'info'): void {
  listener?.({ message, variant });
}

/** 네트워크 끊김 토스트(공용 메시지, error variant). */
export function emitNetworkError(): void {
  emitToast(NETWORK_ERROR_MESSAGE, 'error');
}
