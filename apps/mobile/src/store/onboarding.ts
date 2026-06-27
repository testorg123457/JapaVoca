/**
 * 온보딩(동의) 상태 MMKV 캐시 — 서버가 진실원이고, 이건 콜드스타트 시 약관 화면이
 * 번쩍이는 것을 막기 위한 캐시다. 로그아웃 시 clearOnboardingCache 로 비운다
 * (한 기기에 동시 1유저만 로그인하므로 단일 키로 충분).
 */
import { createMMKV } from 'react-native-mmkv';

import type { ConsentStatus } from '../api/consent';

const storage = createMMKV({ id: 'onboarding' });
const CONSENT_KEY = 'onboarding.consentStatus';

export function getCachedConsentStatus(): ConsentStatus | null {
  const raw = storage.getString(CONSENT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ConsentStatus;
  } catch {
    return null;
  }
}

export function setCachedConsentStatus(status: ConsentStatus): void {
  storage.set(CONSENT_KEY, JSON.stringify(status));
}

export function clearOnboardingCache(): void {
  storage.remove(CONSENT_KEY);
  storage.remove(PENDING_CONSENT_KEY);
}

// 온보딩 중 약관 동의 내용을 임시 보관. 유저 생성 후 서버에 제출한다.
export type PendingConsent = { marketing_agreed: boolean; phone_data_agreed: boolean };

const PENDING_CONSENT_KEY = 'onboarding.pendingConsent';

export function getPendingConsent(): PendingConsent | null {
  const raw = storage.getString(PENDING_CONSENT_KEY);
  if (!raw) { return null; }
  try {
    return JSON.parse(raw) as PendingConsent;
  } catch {
    return null;
  }
}

export function setPendingConsent(consent: PendingConsent): void {
  storage.set(PENDING_CONSENT_KEY, JSON.stringify(consent));
}

export function clearPendingConsent(): void {
  storage.remove(PENDING_CONSENT_KEY);
}
