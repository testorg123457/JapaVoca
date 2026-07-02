/**
 * 기프티콘 바코드/쿠폰번호/유효기간 placeholder.
 *
 * ⚠️ 발급사(B2B) 연동 전 임시. 백엔드 GiftExchange 에 아직 쿠폰번호·바코드·유효기간
 * 필드가 없어서, 발급완료 교환 id 로부터 안정적인(항상 같은) 가짜 값을 만들어 화면을
 * 채운다. 발급사 연동 시 이 파일을 지우고 서버가 내려주는 실제 필드로 교체한다.
 *
 * 관련: apps/server/exchange/{models.py,providers.py} — 실제 발급 데이터 저장/연동 지점.
 */

/** 유효기간 placeholder — 발급일(created_at) + 90일. */
const PLACEHOLDER_VALID_DAYS = 90;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 발급일 기준 유효기간 만료일을 'YYYY.MM.DD' 로 반환(placeholder). */
export function placeholderExpiry(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  d.setDate(d.getDate() + PLACEHOLDER_VALID_DAYS);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 교환 id 로부터 안정적인 12자리 쿠폰번호(placeholder). '1234 5678 9012' 형태. */
export function placeholderCouponCode(id: number): string {
  // id 를 시드로 결정론적 12자리 생성(항상 같은 값 → 새로고침해도 안 바뀜).
  let seed = (id + 1) * 2654435761; // Knuth 승수로 자릿수 섞기
  let digits = '';
  for (let i = 0; i < 12; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    digits += String(seed % 10);
  }
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}
