/**
 * 약관 본문(플레이스홀더) + 필수 동의 판정(순수).
 * ⚠️ TERMS_CONTENT 본문은 임시 문구다 — 출시 전 실제 법무 문구로 교체해야 한다.
 */
import type { TermKind } from '../../navigation/types';

export type ConsentChecks = {
  terms: boolean;
  privacy: boolean;
  phone: boolean;
  marketing: boolean;
};

/** 필수 항목 충족 여부. 게스트는 휴대폰번호(phone) 제외. 마케팅은 항상 선택. */
export function isRequiredConsentComplete(checks: ConsentChecks, isGuest: boolean): boolean {
  if (!checks.terms || !checks.privacy) {
    return false;
  }
  if (!isGuest && !checks.phone) {
    return false;
  }
  return true;
}

export const TERMS_CONTENT: Record<TermKind, { title: string; body: string }> = {
  terms: {
    title: '이용약관',
    body: '[임시 문구] 본 약관은 일본어 한자 보카(JapaVoca) 서비스 이용에 관한 조건을 정합니다. 출시 전 실제 약관으로 교체됩니다.\n\n제1조(목적) ...\n제2조(정의) ...',
  },
  privacy: {
    title: '개인정보 수집·이용 동의',
    body: '[임시 문구] 서비스 제공을 위해 필요한 최소한의 개인정보를 수집·이용합니다. 수집 항목/목적/보유기간은 출시 전 확정됩니다.',
  },
  phone: {
    title: '휴대폰번호 데이터 동의',
    body: '[임시 문구] 본인확인 및 부정 가입(어뷰징) 방지를 위해 휴대폰 번호를 수집·이용하는 데 동의합니다. 게스트 계정에는 적용되지 않습니다.',
  },
  marketing: {
    title: '마케팅 정보 수신 동의 (선택)',
    body: '[임시 문구] 이벤트·혜택 등 마케팅 정보 수신에 동의합니다. 선택 항목이며 미동의 시에도 서비스 이용에 제한이 없습니다.',
  },
};
