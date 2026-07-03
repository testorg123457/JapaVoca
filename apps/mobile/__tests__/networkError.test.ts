/**
 * isNetworkError — 오류가 "네트워크 끊김"인지 판별. 서버가 응답한 오류(4xx/5xx)는
 * 네트워크 오류가 아니다(전역 토스트 대상 아님). axios 오류가 아니면 항상 false.
 */
import { AxiosError, AxiosHeaders } from 'axios';

import { isNetworkError } from '../src/api/errors';

function axiosResponseError(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() } as any;
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {},
  } as any);
}

describe('isNetworkError', () => {
  it('응답이 없는 axios 오류(연결 실패)는 네트워크 오류다', () => {
    expect(isNetworkError(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true);
  });

  it('타임아웃(응답 없음)도 네트워크 오류다', () => {
    expect(isNetworkError(new AxiosError('timeout', 'ECONNABORTED'))).toBe(true);
  });

  it('서버가 응답한 5xx는 네트워크 오류가 아니다', () => {
    expect(isNetworkError(axiosResponseError(500))).toBe(false);
  });

  it('서버가 응답한 4xx는 네트워크 오류가 아니다', () => {
    expect(isNetworkError(axiosResponseError(404))).toBe(false);
  });

  it('axios 오류가 아닌 일반 Error는 네트워크 오류가 아니다', () => {
    expect(isNetworkError(new Error('boom'))).toBe(false);
  });

  it('null/undefined는 네트워크 오류가 아니다', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
