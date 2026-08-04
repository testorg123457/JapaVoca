/**
 * 공용 axios 인스턴스.
 *
 * 요청 시 access token을 자동으로 Authorization 헤더에 주입하고, 401 응답을
 * 받으면 refresh token으로 1회 재발급을 시도한 뒤 원요청을 재시도한다.
 * 재발급도 실패하면 토큰을 비우고 AuthContext를 로그아웃 상태로 되돌린다.
 *
 * 동시에 여러 요청이 401을 받아도 refresh 호출은 한 번만 일어나도록
 * 모듈 단위 refreshPromise로 묶는다(JWT rotation 시 중복 refresh가 서로의
 * refresh token을 무효화하는 것을 방지).
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Config from 'react-native-config';

import { getAccessToken, getRefreshToken, setTokens } from '../store/auth';
import { forceSignOut } from '../store/AuthContext';
import { isNetworkError } from './errors';
import { networkRetryDelayMs, shouldRetryNetworkError } from './retry';
import { beginNetworkRetry, endNetworkRetry } from './retryNotice';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 네트워크 끊김 재시도를 건너뛴다. 로컬 폴백이 있어 빨리 실패하는 게 나은 요청용. */
    skipNetworkRetry?: boolean;
  }
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;      // 401 refresh 재시도 여부
  _netRetry?: number;    // 네트워크 끊김 재시도 횟수
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 기본 요청 상한(ms).
 *
 * ⚠️ 없으면 "TCP는 붙었는데 응답이 안 오는" 망(캡티브 포털, 지하철 핸드오버)에서 요청이
 *    끝나지도 실패하지도 않는다. 그러면 화면이 로딩에 갇히고 오프라인 폴백도 못 탄다.
 *    오래 걸리는 게 정상인 요청(번역 OCR 등)은 호출부에서 timeout을 따로 크게 준다.
 */
const DEFAULT_TIMEOUT_MS = 12000;

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // 상한을 준다 — 이 요청이 매달리면 401을 받은 모든 요청이 함께 매달린다.
  const response = await axios.post<{ access: string }>(
    `${Config.API_BASE_URL}/api/auth/token/refresh/`,
    { refresh: refreshToken },
    { timeout: DEFAULT_TIMEOUT_MS },
  );
  const { access } = response.data;
  setTokens(access, refreshToken);
  return access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    // 네트워크 끊김 — 잠깐 기다렸다 다시 시도한다(멱등한 GET만. retry.ts 참고).
    if (originalRequest && !error.response) {
      const attempt = originalRequest._netRetry ?? 0;
      const retryable = shouldRetryNetworkError({
        hasResponse: false,
        isCancel: axios.isCancel(error),
        isTimeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
        method: originalRequest.method,
        attempt,
        skip: originalRequest.skipNetworkRetry,
      });
      if (retryable) {
        originalRequest._netRetry = attempt + 1;
        await wait(networkRetryDelayMs(attempt));
        // 재시도는 재귀로 이어진다(다음 시도도 이 인터셉터를 다시 탄다). 화면 알림은
        // **최초 진입(attempt 0)에서만** 짝을 만들어, 중간 시도마다 바가 껌뻑이지 않게 한다.
        if (attempt > 0) {
          return apiClient(originalRequest);
        }
        beginNetworkRetry();
        try {
          const retried = await apiClient(originalRequest);
          endNetworkRetry(true);
          return retried;
        } catch (retryError) {
          endNetworkRetry(false);
          throw retryError;
        }
      }
    }

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return apiClient(originalRequest);
    } catch (refreshError) {
      // ⚠️ 망이 끊겨서 재발급을 못 한 것과, 서버가 refresh token을 거부한 것을 구분한다.
      //    구분 없이 로그아웃시키면 지하철에서 잠깐 끊긴 것만으로 로그아웃되고
      //    다시 소셜 로그인을 해야 한다. 응답을 못 받은 경우엔 세션을 유지하고
      //    오류만 올려보내 호출부가 평소의 네트워크 오류로 다루게 한다.
      if (isNetworkError(refreshError)) {
        return Promise.reject(refreshError);
      }
      forceSignOut();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
