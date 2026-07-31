/**
 * 캐시상자 개봉 API.
 *
 * 백엔드 실제 계약(apps/server rewards/views.py OpenBoxView):
 *   POST /api/rewards/boxes/{id}/open/  (body 선택: {ad_verified})
 *     → { box_id, grade, reward_cash, rewards, balance_after }
 *   이미 개봉된 상자는 409, 없는 상자는 404.
 *
 * 개봉 보상은 서버가 확정한다(클라가 캐시 금액을 신뢰하지 않음).
 */
import apiClient from './client';
import type { BoxGrade } from './hooks';

export type OpenBoxResult = {
  box_id: number;
  grade: BoxGrade;
  /** 묶음 상자면 개별 보상의 합계. */
  reward_cash: number;
  /** 개별 보상 목록(낱개면 길이 1). 서버가 확정한 값. */
  rewards?: number[];
  balance_after: number;
};

/**
 * 개봉 요청 상한(ms).
 *
 * ⚠️ 없으면 안 된다. 개봉 화면은 응답을 받아야 'opening' → 'revealed'로 넘어가는데,
 *    요청이 끝나지도 실패하지도 않으면 그 상태에 갇혀 화면이 멈춘 것처럼 보인다
 *    (탭·버튼이 전부 phase 가드에 막힘). 끊긴 네트워크에서 응답이 영영 안 오는 경우가 있다.
 */
const OPEN_TIMEOUT_MS = 15000;

/**
 * 상자 개봉. adVerified 는 "보상형 광고를 봤는지"를 서버에 알려 audit(opened_via_ad)에
 * 반영한다. ⚠️ 단, 이 클라 주장값은 보상 크기 결정에 신뢰돼선 안 되고, 실제 검증은
 * 추후 AdMob SSV 서버 콜백으로 대체해야 한다(CLAUDE.md).
 */
export async function openBox(
  boxId: number,
  adVerified = false,
): Promise<OpenBoxResult> {
  const response = await apiClient.post<OpenBoxResult>(
    `/api/rewards/boxes/${boxId}/open/`,
    { ad_verified: adVerified },
    { timeout: OPEN_TIMEOUT_MS },
  );
  return response.data;
}
