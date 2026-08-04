/**
 * 번역 기능 에러 분류 + 사용자 문구.
 *
 * 문구는 앱 톤: 사과 없이 다음 행동을 안내한다.
 */
export type TransErrorKind =
  | 'permission-denied'
  | 'permission-blocked'
  | 'unreadable-image'
  | 'too-large'
  | 'no-text'
  | 'server'
  | 'unknown';

export function classifyTranslateError(e: unknown): TransErrorKind {
  const status = (e as { response?: { status?: number } })?.response?.status;
  if (typeof status === 'number' && status >= 500) {
    return 'server';
  }
  if (status === 413 || status === 400) {
    // 이미지 크기/길이 등 요청 자체 문제 — 재시도한다고 풀리지 않는다.
    return 'too-large';
  }
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes('permission-blocked')) {
    return 'permission-blocked';
  }
  if (msg.includes('permission')) {
    return 'permission-denied';
  }
  if (msg.includes('unreadable-image')) {
    return 'unreadable-image';
  }
  if (msg.includes('no-text')) {
    return 'no-text';
  }
  if (msg.includes('network')) {
    return 'server';
  }
  return 'unknown';
}

/**
 * title = 무슨 일이 났는지 / message = 어떻게 고치는지. 둘은 각자 한 가지 일만 한다.
 * 전면 안내(빈 화면 등)는 둘 다 쓰고, 토스트는 `toastText()`로 한 줄로 합쳐 쓴다.
 */
export function errorMessage(kind: TransErrorKind): { title: string; message: string } {
  switch (kind) {
    case 'permission-denied':
      return { title: '카메라 권한이 필요해요', message: '카메라를 허용하면 촬영할 수 있어요' };
    case 'permission-blocked':
      return { title: '카메라 권한이 꺼져 있어요', message: '설정에서 카메라 권한을 켜주세요' };
    case 'unreadable-image':
      return { title: '사진을 불러오지 못했어요', message: '다른 사진을 골라주세요' };
    case 'too-large':
      return { title: '이미지가 너무 커요', message: '더 작게 찍거나 일부만 잘라주세요' };
    case 'no-text':
      return { title: '글자를 찾지 못했어요', message: '일본어가 또렷하게 나오도록 다시 찍어주세요' };
    case 'server':
      return { title: '번역하지 못했어요', message: '네트워크를 확인해주세요' };
    default:
      return { title: '번역하지 못했어요', message: '다시 시도해주세요' };
  }
}

/**
 * 토스트 한 줄 문구.
 *
 * ⚠️ 예전엔 호출부가 `message`만 넘겨서 **무슨 일이 났는지가 빠진 채** 지시문만
 *    떴다("다른 사진으로 다시 시도해 주세요"). 토스트는 한 줄이라 title이 먼저 와야 한다.
 */
export function toastText(kind: TransErrorKind): string {
  const { title, message } = errorMessage(kind);
  return `${title}. ${message}`;
}
