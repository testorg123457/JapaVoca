/**
 * 기프티콘 교환 API 훅 — 상품/요청/내역.
 *
 * 백엔드 실제 계약(apps/server exchange):
 *   GET  /api/exchange/products/  → [{code,name,price_cash,provider}]
 *   POST /api/exchange/request/   {product_code, ad_verified, idempotency_key?}
 *       → GiftExchange (성공). 실패 시 400 {detail, exchange?}.
 *   GET  /api/exchange/history/   → 페이지네이션 {count,next,previous,results}
 *   GET  /api/exchange/ad-status/?nonce= → {required, verified, ad_log_id}
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import apiClient from './client';

export type Product = {
  code: string;
  name: string;
  price_cash: number;
  provider: string;
  /** 상품 이미지 URL(기프티콘 썸네일). 백엔드 미제공 시 카테고리 아이콘으로 폴백. */
  image_url?: string;
};

export function useProducts() {
  return useQuery({
    queryKey: ['exchange', 'products'],
    queryFn: async () =>
      (await apiClient.get<Product[]>('/api/exchange/products/')).data,
  });
}

export type GiftExchangeStatus = 'requested' | 'issued' | 'failed' | 'refunded';

export type GiftExchange = {
  id: number;
  product_code: string;
  cash_cost: number;
  provider: string;
  provider_order_id: string;
  status: GiftExchangeStatus;
  ad_verified: boolean;
  created_at: string;
  issued_at: string | null;
};

export type ExchangeRequestBody = {
  product_code: string;
  ad_verified: boolean;
  idempotency_key?: string;
  /** SSV 엄격 모드 광고 증빙(AdRewardLog.id). Mock 모드면 서버가 무시. */
  ad_log_id?: number | null;
};

export function useRequestExchange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ExchangeRequestBody) =>
      (await apiClient.post<GiftExchange>('/api/exchange/request/', body)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['exchange', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // 교환 알림 생성됨
    },
  });
}

export type AdStatus = {
  /** 서버가 SSV 엄격 모드인지(ADMOB_SSV_VERIFY). false 면 폴링 없이 진행. */
  required: boolean;
  verified: boolean;
  ad_log_id: number | null;
};

export async function fetchAdStatus(nonce: string): Promise<AdStatus> {
  const response = await apiClient.get<AdStatus>('/api/exchange/ad-status/', {
    params: { nonce },
  });
  return response.data;
}

/**
 * SSV 콜백 도착 폴링. Mock 모드(required=false)면 1회 조회로 즉시 끝난다.
 * 검증 확인 또는 시도 소진 시 마지막 상태 반환. 네트워크 오류는 남은 횟수 내 재시도.
 */
export async function pollAdStatus(
  nonce: string,
  { intervalMs = 2000, maxAttempts = 15 } = {},
): Promise<AdStatus> {
  let last: AdStatus = { required: true, verified: false, ad_log_id: null };
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      last = await fetchAdStatus(nonce);
      if (!last.required || last.verified) {
        return last;
      }
    } catch {
      // 네트워크 오류 — 남은 횟수 내 재시도.
    }
    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), intervalMs));
    }
  }
  return last;
}

export type ExchangeHistoryPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: GiftExchange[];
};

export function useExchangeHistory() {
  return useInfiniteQuery({
    queryKey: ['exchange', 'history'],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<ExchangeHistoryPage>(
        '/api/exchange/history/',
        { params: { page: pageParam } },
      );
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
  });
}
