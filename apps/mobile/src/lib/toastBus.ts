/**
 * toastBus — 전역 토스트 브리지.
 *
 * ToastProvider(React)와 컴포넌트 밖 코드(React Query 캐시 onError, axios 등)를
 * 잇는 모듈 싱글턴. Provider가 마운트되며 리스너를 등록하고, 어디서든 emitToast()/
 * emitNetworkError()를 호출하면 화면에 토스트가 뜬다.
 *
 * 앱 트리에는 ToastProvider가 하나뿐이므로 리스너 슬롯도 하나(단일 슬롯)다.
 *
 * ⚠️ 토스트는 **바 하나가 내용을 바꿔 끼는** 방식이다(새 바가 겹쳐 뜨지 않는다).
 *    "재시도 중 → 연결 안 됨"처럼 이어지는 흐름을 한 자리에서 보여주기 위함.
 */
export type ToastVariant =
  /** 완료·성공 안내. 지금 앱의 기본 토스트는 전부 여기 해당한다. */
  | 'info'
  /** 실패·경고. */
  | 'error'
  /** 진행 중(네트워크 재시도). 스스로 사라지지 않고 결과가 나오면 교체된다. */
  | 'retrying';

export interface ToastAction {
  /** 동사로 — 누르면 무슨 일이 생기는지. */
  label: string;
  onPress: () => void;
}

export interface ToastPayload {
  message: string;
  variant: ToastVariant;
  /** 우측 액션(선택). 있으면 놓치지 않도록 자동 사라짐이 길어진다. */
  action?: ToastAction;
  /** 자동 사라짐(ms). null이면 사라지지 않는다(진행 중 상태). */
  duration?: number | null;
}

/** 네트워크 공용 문구 — 화면마다 다르게 쓰지 않는다. */
// "다시 시도" 버튼이 붙지 않는 자리(모달·쓰기 실패)에서도 혼자 읽히도록 문장으로 둔다.
export const NETWORK_ERROR_MESSAGE = '인터넷에 연결되지 않았어요';
export const NETWORK_RETRYING_MESSAGE = '연결을 다시 시도하는 중…';

/** 기본 자동 사라짐(ms). 액션이 있으면 더 길게 둔다. */
export const TOAST_DURATION_MS = 2500;
export const TOAST_ACTION_DURATION_MS = 6000;

type Listener = (payload: ToastPayload | null) => void;
let listener: Listener | null = null;

/** ToastProvider가 마운트/언마운트 시 자신을 등록/해제(null)한다. */
export function setToastListener(fn: Listener | null): void {
  listener = fn;
}

/** 임의 페이로드로 띄운다(액션·지속시간이 필요한 경우). */
export function emitToastPayload(payload: ToastPayload): void {
  listener?.(payload);
}

export function emitToast(message: string, variant: ToastVariant = 'info'): void {
  emitToastPayload({ message, variant });
}

/** 떠 있는 토스트를 지운다(결과가 성공이라 따로 알릴 게 없을 때). */
export function dismissToast(): void {
  listener?.(null);
}

/**
 * "다시 시도"가 무엇을 다시 부르는지는 api 레이어가 안다(queryClient가 등록).
 * 등록되지 않았으면 액션 없는 토스트가 뜬다.
 */
let retryAction: (() => void) | null = null;
export function setNetworkRetryAction(fn: (() => void) | null): void {
  retryAction = fn;
}

/** 재시도 중임을 알리는 토스트. 결과가 나올 때까지 사라지지 않는다. */
export function emitNetworkRetrying(): void {
  emitToastPayload({
    message: NETWORK_RETRYING_MESSAGE,
    variant: 'retrying',
    duration: null,
  });
}

/** 네트워크 끊김 토스트. 재시도 액션이 등록돼 있으면 함께 보여준다. */
export function emitNetworkError(): void {
  emitToastPayload({
    message: NETWORK_ERROR_MESSAGE,
    variant: 'error',
    action: retryAction ? { label: '다시 시도', onPress: retryAction } : undefined,
    duration: retryAction ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS,
  });
}
