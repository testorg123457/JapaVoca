/**
 * 인증 관련 API 호출.
 *
 * 백엔드 실제 응답은 { tokens: { access, refresh }, user, created } 형태
 * (apps/server accounts/views.py 기준)이므로, 호출부가 필요한 { access, refresh }만
 * 꺼내 돌려준다.
 *
 * 로그인(게스트/구글/카카오)은 아직 JWT가 없거나 자격 검증 단계라 apiClient(401→refresh
 * 인터셉터)를 거치지 않고 raw axios로 호출한다. apiClient를 썼다면, 토큰이 유효하지 않아
 * 서버가 401을 줄 때 인터셉터가 이를 "JWT 만료"로 오인해 무관한 refresh로 재시도하며
 * 원래 에러를 가려버린다.
 *
 * 단, linkAccount(계정 연결)는 *현재 게스트 JWT로 인증된* 요청이어야 하므로 apiClient를 쓴다.
 */
import axios from 'axios';
import Config from 'react-native-config';

import apiClient from './client';

type LoginResponse = {
  tokens: { access: string; refresh: string };
  user: {
    id: number;
    provider: 'guest' | 'google' | 'kakao';
    google_uid: string | null;
    email: string | null;
    nickname: string;
    is_guest: boolean;
    selected_jlpt_level: string | null;
    status: string;
    created_at: string;
  };
  created: boolean;
};

type Tokens = { access: string; refresh: string };
type LoginResult = { tokens: Tokens; created: boolean };

/**
 * 게스트 로그인. 기기 UUID(guest_uid)를 보내면 서버가 게스트 유저를 get_or_create 하고
 * JWT를 발급한다. 소셜 키 없이 즉시 시작 가능. (구글/카카오와 동일하게 raw axios)
 */
export async function guestLogin(guestUid: string): Promise<LoginResult> {
  const response = await axios.post<LoginResponse>(
    `${Config.API_BASE_URL}/api/auth/guest/`,
    { guest_uid: guestUid },
  );
  return { tokens: response.data.tokens, created: response.data.created };
}

export async function googleLogin(idToken: string): Promise<LoginResult> {
  const response = await axios.post<LoginResponse>(
    `${Config.API_BASE_URL}/api/auth/google/`,
    { id_token: idToken },
  );
  return { tokens: response.data.tokens, created: response.data.created };
}

/**
 * 카카오 로그인. 클라 카카오 SDK가 받은 access token을 서버로 보내면 서버가
 * kapi.kakao.com으로 검증 후 JWT를 발급한다. (구글과 동일하게 raw axios — 401 우회)
 * ⚠️ 클라 카카오 SDK/네이티브 앱키 설정이 선결조건.
 */
export async function kakaoLogin(accessToken: string): Promise<LoginResult> {
  const response = await axios.post<LoginResponse>(
    `${Config.API_BASE_URL}/api/auth/kakao/`,
    { access_token: accessToken },
  );
  return { tokens: response.data.tokens, created: response.data.created };
}

export type LinkResult = { tokens: Tokens; switched: boolean };

/**
 * 게스트 계정에 구글/카카오 연결("승격"). **현재 게스트 JWT로 인증된 요청**이어야 하므로
 * apiClient를 쓴다(자동 토큰 주입). 응답의 새 토큰으로 교체(signIn)해야 한다.
 *
 * switched=true → 그 소셜 계정이 이미 있어 *기존 계정으로 로그인*(게스트 진행분 폐기).
 * switched=false → 같은 행을 승격(캐시·진행상황 보존).
 */
export async function linkAccount(
  provider: 'google' | 'kakao',
  token: string,
): Promise<LinkResult> {
  const response = await apiClient.post<{ tokens: Tokens; switched: boolean }>(
    '/api/auth/link/',
    { provider, token },
  );
  return { tokens: response.data.tokens, switched: response.data.switched };
}

/**
 * 회원 탈퇴 — 본인 계정 영구 삭제(DELETE /api/auth/me/). 현재 JWT로 인증된 요청.
 * 성공(204) 후 호출부는 반드시 로그아웃(토큰 폐기)해야 한다. ⚠️ 남은 캐시는 소멸.
 */
export async function deleteAccount(): Promise<void> {
  await apiClient.delete('/api/auth/me/');
}
