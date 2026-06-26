/**
 * 테마 모드 영속 store — 사용자가 고른 라이트/다크/시스템 선택을 MMKV에 저장한다.
 *
 * 'system' = OS 다크모드 설정을 따름(기본값). 'light'/'dark' = 사용자가 고정.
 * 실제 색 스킴(light|dark) 계산은 ThemeProvider가 이 값 + useColorScheme()으로 한다.
 * (onboarding.ts 와 동일한 MMKV 패턴)
 */
import { createMMKV } from 'react-native-mmkv';

export type ThemeMode = 'system' | 'light' | 'dark';

const storage = createMMKV({ id: 'theme' });
const MODE_KEY = 'theme.mode';

export function getThemeMode(): ThemeMode {
  const raw = storage.getString(MODE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  return 'system';
}

export function setThemeMode(mode: ThemeMode): void {
  storage.set(MODE_KEY, mode);
}
