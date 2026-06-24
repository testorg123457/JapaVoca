/**
 * 기프티콘 교환 API 훅 — 상품/요청/내역.
 *
 * 백엔드 실제 계약(apps/server exchange):
 *   GET  /api/exchange/products/  → [{code,name,price_cash,provider}]
 *   POST /api/exchange/request/   {product_code, ad_verified, idempotency_key?}
 *       → GiftExchange (성공). 실패 시 400 {detail, exchange?}.
 *   GET  /api/exchange/history/   → 페이지네이션 {count,next,previous,results}
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
    },
  });
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
