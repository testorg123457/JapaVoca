/**
 * 약관/권한 동의 API + React Query 훅. 백엔드 /api/auth/consent/(status) 기준.
 * 동의 상태는 서버가 진실원이고, MMKV 캐시(store/onboarding)를 initialData 로 써서
 * 재실행 시 약관 화면 깜빡임을 막는다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from './client';
import { getCachedConsentStatus, setCachedConsentStatus } from '../store/onboarding';

export type ConsentStatus = {
  required: boolean;
  terms_version: string;
  privacy_version: string;
  marketing_agreed: boolean;
  phone_data_agreed: boolean;
};

export type ConsentSubmit = {
  marketing_agreed: boolean;
  phone_data_agreed: boolean;
  phone_number?: string | null;
};

export async function getConsentStatus(): Promise<ConsentStatus> {
  return (await apiClient.get<ConsentStatus>('/api/auth/consent/status/')).data;
}

export async function submitConsent(payload: ConsentSubmit): Promise<ConsentStatus> {
  return (await apiClient.post<ConsentStatus>('/api/auth/consent/', payload)).data;
}

export const CONSENT_QUERY_KEY = ['consent', 'status'] as const;

export function useConsentStatus(enabled: boolean) {
  return useQuery({
    queryKey: CONSENT_QUERY_KEY,
    queryFn: getConsentStatus,
    enabled,
    staleTime: 0,
    initialData: () => getCachedConsentStatus() ?? undefined,
  });
}

/** 동의 제출 — 성공 시 consent 캐시(쿼리 + MMKV)를 즉시 갱신해 게이트가 재계산되게 한다. */
export function useSubmitConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitConsent,
    onSuccess: (data) => {
      queryClient.setQueryData(CONSENT_QUERY_KEY, data);
      setCachedConsentStatus(data);
    },
  });
}
