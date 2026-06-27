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

// 게스트 기기 식별자 — 한 번 만들면 영속(재로그인해도 같은 게스트 계정으로).
// 보안용이 아니라 "이 기기의 게스트"를 가리키는 불투명 ID라 간이 UUIDv4로 충분하다.
const GUEST_UID_KEY = 'auth.guestUid';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    // y 자리는 variant 비트(8~b)만 허용 — 비트연산 없이 동일 결과.
    const v = ch === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
}

/** 이 기기의 게스트 UID를 반환(없으면 생성·영속). 게스트 로그인 요청에 사용한다. */
export function getOrCreateGuestUid(): string {
  const existing = storage.getString(GUEST_UID_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }
  const fresh = uuidv4();
  storage.set(GUEST_UID_KEY, fresh);
  return fresh;
}

// 온보딩 미완료 상태에서 선택한 로그인 방식을 임시 보관.
// 약관·권한·학습 설정을 모두 마친 뒤 StudySelect에서 실제 유저를 생성한다.
export type PendingAuth = { method: 'guest' } | { method: 'google'; idToken: string };

const PENDING_AUTH_KEY = 'auth.pendingAuth';

export function getPendingAuth(): PendingAuth | null {
  const raw = storage.getString(PENDING_AUTH_KEY);
  if (!raw) { return null; }
  try {
    return JSON.parse(raw) as PendingAuth;
  } catch {
    return null;
  }
}

export function setPendingAuth(auth: PendingAuth): void {
  storage.set(PENDING_AUTH_KEY, JSON.stringify(auth));
}

export function clearPendingAuth(): void {
  storage.remove(PENDING_AUTH_KEY);
}
