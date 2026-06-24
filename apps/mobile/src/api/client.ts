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

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
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

  const response = await axios.post<{ access: string }>(
    `${Config.API_BASE_URL}/api/auth/token/refresh/`,
    { refresh: refreshToken },
  );
  const { access } = response.data;
  setTokens(access, refreshToken);
  return access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

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
      forceSignOut();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
