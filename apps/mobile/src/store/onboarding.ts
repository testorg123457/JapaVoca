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
}
