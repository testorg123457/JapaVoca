/**
 * 네트워크 끊김 재시도 정책 테스트.
 *
 * 버그: 재시도가 React Query 쿼리에만 걸려 있어서, 뮤테이션과 직접 axios 호출
 * (퀴즈 세트·채점·북마크)은 한 번 실패하면 곧바로 "연결 안 됨"이 떴다.
 */
import {
  NETWORK_RETRY_DELAYS_MS,
  networkRetryDelayMs,
  shouldRetryNetworkError,
} from '../src/api/retry';

const base = {
  hasResponse: false, isCancel: false, isTimeout: false, method: 'get', attempt: 0,
};

describe('shouldRetryNetworkError', () => {
  it('네트워크 끊김 GET은 재시도한다', () => {
    expect(shouldRetryNetworkError(base)).toBe(true);
  });

  it('메서드가 없으면 GET으로 본다(axios 기본값)', () => {
    expect(shouldRetryNetworkError({ ...base, method: undefined })).toBe(true);
  });

  it('대소문자 섞인 메서드도 GET으로 인식한다', () => {
    expect(shouldRetryNetworkError({ ...base, method: 'GET' })).toBe(true);
  });

  it('쓰기 요청은 재시도하지 않는다 — 중복 실행 위험', () => {
    for (const method of ['post', 'patch', 'put', 'delete']) {
      expect(shouldRetryNetworkError({ ...base, method })).toBe(false);
    }
  });

  it('서버가 응답한 오류(4xx/5xx)는 재시도하지 않는다', () => {
    expect(shouldRetryNetworkError({ ...base, hasResponse: true })).toBe(false);
  });

  it('타임아웃은 재시도하지 않는다 — 대기가 (타임아웃 × 시도횟수)로 곱해진다', () => {
    expect(shouldRetryNetworkError({ ...base, isTimeout: true })).toBe(false);
  });

  it('취소된 요청은 재시도하지 않는다', () => {
    expect(shouldRetryNetworkError({ ...base, isCancel: true })).toBe(false);
  });

  it('호출부가 끄면 재시도하지 않는다', () => {
    expect(shouldRetryNetworkError({ ...base, skip: true })).toBe(false);
  });

  it('정해진 횟수를 넘으면 멈춘다', () => {
    const last = NETWORK_RETRY_DELAYS_MS.length - 1;
    expect(shouldRetryNetworkError({ ...base, attempt: last })).toBe(true);
    expect(shouldRetryNetworkError({ ...base, attempt: last + 1 })).toBe(false);
  });
});

describe('networkRetryDelayMs', () => {
  it('시도마다 간격이 늘어난다', () => {
    const delays = NETWORK_RETRY_DELAYS_MS.map((_, i) => networkRetryDelayMs(i));
    expect(delays).toEqual([...NETWORK_RETRY_DELAYS_MS]);
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it('총 대기 시간이 몇 초 안쪽이다', () => {
    const total = NETWORK_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(1000);
    expect(total).toBeLessThanOrEqual(5000);
  });

  it('범위 밖이면 0', () => {
    expect(networkRetryDelayMs(NETWORK_RETRY_DELAYS_MS.length)).toBe(0);
  });
});
