/**
 * pollAdStatus — SSV 콜백 도착 폴링 로직.
 * apiClient 는 모킹(네이티브 의존 차단), intervalMs:0 으로 타이머 대기 제거.
 */
import apiClient from '../src/api/client';
import { pollAdStatus } from '../src/api/exchange';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('pollAdStatus', () => {
  beforeEach(() => mockedGet.mockReset());

  it('Mock 모드(required=false)면 1회 호출로 즉시 반환', async () => {
    mockedGet.mockResolvedValue({
      data: { required: false, verified: false, ad_log_id: null },
    });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 5 });
    expect(res.required).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('검증 도착 시 그 시점에 ad_log_id 와 함께 반환', async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: { required: true, verified: false, ad_log_id: null },
      })
      .mockResolvedValueOnce({
        data: { required: true, verified: true, ad_log_id: 7 },
      });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 5 });
    expect(res.verified).toBe(true);
    expect(res.ad_log_id).toBe(7);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('시도 소진 시 미검증 상태 반환(타임아웃)', async () => {
    mockedGet.mockResolvedValue({
      data: { required: true, verified: false, ad_log_id: null },
    });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 3 });
    expect(res.verified).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it('네트워크 오류는 남은 횟수 내 재시도로 흡수', async () => {
    mockedGet
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce({
        data: { required: true, verified: true, ad_log_id: 3 },
      });
    const res = await pollAdStatus('n', { intervalMs: 0, maxAttempts: 5 });
    expect(res.verified).toBe(true);
    expect(res.ad_log_id).toBe(3);
  });
});
