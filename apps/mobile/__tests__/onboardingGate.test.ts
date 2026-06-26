import { computeGateStatus } from '../src/navigation/gateStatus';

describe('computeGateStatus', () => {
  it('동의 로딩 중이면 loading', () => {
    expect(
      computeGateStatus({ consentLoading: true, consentRequired: undefined, permsGranted: null }),
    ).toBe('loading');
  });
  it('권한 상태 미확정(null)이면 loading', () => {
    expect(
      computeGateStatus({ consentLoading: false, consentRequired: false, permsGranted: null }),
    ).toBe('loading');
  });
  it('동의 필요면 terms', () => {
    expect(
      computeGateStatus({ consentLoading: false, consentRequired: true, permsGranted: false }),
    ).toBe('terms');
  });
  it('동의 완료 + 권한 미허용이면 permissions', () => {
    expect(
      computeGateStatus({ consentLoading: false, consentRequired: false, permsGranted: false }),
    ).toBe('permissions');
  });
  it('동의 완료 + 권한 허용이면 ready', () => {
    expect(
      computeGateStatus({ consentLoading: false, consentRequired: false, permsGranted: true }),
    ).toBe('ready');
  });
});
