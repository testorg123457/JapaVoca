/**
 * 온보딩 게이트 — 로그인 후 약관 동의/권한 허용을 통과해야 Main에 진입한다.
 * computeGateStatus 는 순수 함수(테스트 대상), useOnboardingGate 는 동의(쿼리) +
 * 권한(로컬, AppState 복귀 시 재확인)을 조합한다.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { CONSENT_QUERY_KEY, useConsentStatus } from '../api/consent';
import { useMe } from '../api/hooks';
import { checkRequiredPermissions } from '../lib/permissions';
import { setCachedConsentStatus } from '../store/onboarding';
import { computeGateStatus, type GateStatus } from './gateStatus';

export { computeGateStatus };
export type { GateStatus };

export function useOnboardingGate(isLoggedIn: boolean): {
  status: GateStatus;
  recheck: () => void;
} {
  const consent = useConsentStatus(isLoggedIn);
  const me = useMe();
  const queryClient = useQueryClient();
  const [permsGranted, setPermsGranted] = useState<boolean | null>(null);
  // study_mode 가 null 이면 학습 선택(온보딩) 미완료. me 로딩 전이면 undefined.
  const studyNeeded = me.data ? me.data.study_mode == null : undefined;

  const checkPerms = useCallback(async () => {
    const ok = await checkRequiredPermissions();
    setPermsGranted(ok);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setPermsGranted(null);
      return;
    }
    checkPerms();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        checkPerms();
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, checkPerms]);

  // 서버 동의 상태를 MMKV에 캐시(재실행 시 약관 깜빡임 방지).
  useEffect(() => {
    if (consent.isSuccess && consent.data) {
      setCachedConsentStatus(consent.data);
    }
  }, [consent.isSuccess, consent.data]);

  const status: GateStatus = !isLoggedIn
    ? 'loading'
    : computeGateStatus({
        consentLoading: consent.isLoading,
        consentRequired: consent.data?.required,
        permsGranted,
        studyNeeded,
      });

  const recheck = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CONSENT_QUERY_KEY });
    checkPerms();
  }, [queryClient, checkPerms]);

  return { status, recheck };
}
