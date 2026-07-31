/**
 * 효과음 on/off 영속 store — MMKV.
 *
 * 기기 취향이라 서버에 안 올린다(계정 설정이 아니라 이 기기 설정).
 * 기본값은 켜짐 — 저장된 값이 없으면 소리가 난다.
 */
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'sfx' });
const ENABLED_KEY = 'sfx.enabled';

export function isSfxEnabled(): boolean {
  return storage.getBoolean(ENABLED_KEY) ?? true;
}

export function setSfxEnabled(enabled: boolean): void {
  storage.set(ENABLED_KEY, enabled);
}
