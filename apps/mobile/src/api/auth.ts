/**
 * 인증 관련 API 호출.
 *
 * 백엔드 실제 응답은 { tokens: { access, refresh }, user, created } 형태
 * (apps/server accounts/views.py 의 POST /api/auth/google/ 기준)이므로,
 * 이 모듈에서 호출부가 필요한 { access, refresh }만 꺼내 돌려준다.
 *
 * 로그인 전이라 아직 JWT가 없는 호출이므로 apiClient(401→refresh 인터셉터)를
 * 거치지 않고 raw axios로 호출한다. apiClient를 썼다면, Google id_token이
 * 유효하지 않아 서버가 401을 줄 때 인터셉터가 이를 "JWT 만료"로 오인해 무관한
 * refresh token으로 재시도하며 원래 에러를 가려버린다.
 */
import axios from 'axios';
import Config from 'react-native-config';

type GoogleLoginResponse = {
  tokens: { access: string; refresh: string };
  user: {
    id: number;
    google_uid: string;
    email: string;
    nickname: string;
    selected_jlpt_level: string | null;
    status: string;
    created_at: string;
  };
  created: boolean;
};

export async function googleLogin(
  idToken: string,
): Promise<{ access: string; refresh: string }> {
  const response = await axios.post<GoogleLoginResponse>(
    `${Config.API_BASE_URL}/api/auth/google/`,
    { id_token: idToken },
  );
  return response.data.tokens;
}

/**
 * 카카오 로그인. 클라 카카오 SDK가 받은 access token을 서버로 보내면 서버가
 * kapi.kakao.com으로 검증 후 JWT를 발급한다. (구글과 동일하게 raw axios — 401 우회)
 * ⚠️ 클라 카카오 SDK/네이티브 앱키 설정이 선결조건(03-구현순서-선결조건.md).
 */
export async function kakaoLogin(
  accessToken: string,
): Promise<{ access: string; refresh: string }> {
  const response = await axios.post<GoogleLoginResponse>(
    `${Config.API_BASE_URL}/api/auth/kakao/`,
    { access_token: accessToken },
  );
  return response.data.tokens;
}

/**
 * DEBUG 전용 dev 로그인. 구글 OAuth 없이 고정 테스트 유저로 JWT를 받는다.
 * 백엔드 /api/auth/dev-login/ 은 DEBUG=False 면 404이므로 실 서비스에선 호출 불가.
 * __DEV__ 빌드의 로그인 화면에서만 사용한다.
 */
export async function devLogin(): Promise<{ access: string; refresh: string }> {
  const response = await axios.post<GoogleLoginResponse>(
    `${Config.API_BASE_URL}/api/auth/dev-login/`,
  );
  return response.data.tokens;
}
