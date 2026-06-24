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
