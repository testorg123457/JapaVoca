/**
 * 온보딩 게이트 상태 — 순수 로직(네이티브/React 의존 없음, 단위 테스트 대상).
 * 훅(useOnboardingGate)은 navigation/onboardingGate.ts 에 있다.
 */
export type GateStatus = 'loading' | 'terms' | 'permissions' | 'ready';

export function computeGateStatus(input: {
  consentLoading: boolean;
  consentRequired: boolean | undefined;
  permsGranted: boolean | null;
}): GateStatus {
  if (input.consentLoading || input.consentRequired === undefined || input.permsGranted === null) {
    return 'loading';
  }
  if (input.consentRequired) {
    return 'terms';
  }
  if (!input.permsGranted) {
    return 'permissions';
  }
  return 'ready';
}
