/**
 * API 오류 판별 헬퍼.
 */
import axios from 'axios';

/**
 * "네트워크 끊김" 오류인지 판별한다.
 *
 * axios 오류이면서 서버 응답(response)이 없는 경우 = 연결 실패/타임아웃 등.
 * 서버가 응답한 오류(4xx/5xx)는 네트워크 오류로 보지 않는다(전역 토스트 대상 아님).
 * axios 오류가 아니면(예: 코드에서 던진 일반 Error) 항상 false.
 */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
