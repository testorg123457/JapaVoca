import { isRequiredConsentComplete } from '../src/screens/onboarding/termsContent';

describe('isRequiredConsentComplete', () => {
  const base = { terms: false, privacy: false, phone: false, marketing: false };

  it('비게스트는 약관+개인정보+휴대폰번호 모두 필요', () => {
    expect(isRequiredConsentComplete({ ...base, terms: true, privacy: true }, false)).toBe(false);
    expect(
      isRequiredConsentComplete({ ...base, terms: true, privacy: true, phone: true }, false),
    ).toBe(true);
  });

  it('게스트는 약관+개인정보만 필요(휴대폰번호 무관)', () => {
    expect(isRequiredConsentComplete({ ...base, terms: true, privacy: true }, true)).toBe(true);
    expect(isRequiredConsentComplete({ ...base, terms: true }, true)).toBe(false);
  });

  it('마케팅은 선택 — 필수 판정에 영향 없음', () => {
    expect(
      isRequiredConsentComplete(
        { ...base, terms: true, privacy: true, phone: true, marketing: false },
        false,
      ),
    ).toBe(true);
  });
});
