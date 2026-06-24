/**
 * 인증 토큰 저장소 — MMKV 기반.
 *
 * JWT(access/refresh)를 디바이스에 영속 저장한다. 캐시(자산)와 직접 엮이지
 * 않지만, 토큰 유무가 로그인 상태의 단일 기준이므로 이 모듈만 토큰을 만진다.
 *
 * 주의: 이 모듈은 "순수 저장/조회"만 담당한다. 화면 전환을 일으키는 반응형
 * 로그인 상태는 store/AuthContext.tsx 가 관리한다.
 */
import { createMMKV } from 'react-native-mmkv';

// MMKV v4(Nitro)는 MMKV가 타입 전용 export이므로 createMMKV 팩토리로 생성한다.
const storage = createMMKV({ id: 'auth' });

const ACCESS_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';

export function getAccessToken(): string | null {
  return storage.getString(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return storage.getString(REFRESH_KEY) ?? null;
}

export function setTokens(access: string, refresh: string): void {
  storage.set(ACCESS_KEY, access);
  storage.set(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  // v4 삭제 메서드는 remove(key). (delete는 존재하지 않음)
  storage.remove(ACCESS_KEY);
  storage.remove(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  const token = getAccessToken();
  return token !== null && token.length > 0;
}
