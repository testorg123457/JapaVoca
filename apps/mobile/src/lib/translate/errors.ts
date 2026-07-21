/**
 * 번역 기능 에러 분류 + 사용자 문구.
 *
 * 문구는 앱 톤: 사과 없이 다음 행동을 안내한다.
 */
export type TransErrorKind = 'permission' | 'no-text' | 'server' | 'unknown';

export function classifyTranslateError(e: unknown): TransErrorKind {
  const status = (e as { response?: { status?: number } })?.response?.status;
  if (typeof status === 'number' && status >= 500) {
    return 'server';
  }
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes('permission')) {
    return 'permission';
  }
  if (msg.includes('no-text')) {
    return 'no-text';
  }
  if (msg.includes('network')) {
    return 'server';
  }
  return 'unknown';
}

export function errorMessage(kind: TransErrorKind): { title: string; message: string } {
  switch (kind) {
    case 'permission':
      return { title: '카메라 권한이 필요해요', message: '설정에서 카메라 권한을 켜면 촬영할 수 있어요.' };
    case 'no-text':
      return { title: '글자를 찾지 못했어요', message: '일본어가 또렷하게 나오도록 다시 찍어 주세요.' };
    case 'server':
      return { title: '번역하지 못했어요', message: '네트워크를 확인하고 다시 시도해 주세요.' };
    default:
      return { title: '번역하지 못했어요', message: '잠시 후 다시 시도해 주세요.' };
  }
}
