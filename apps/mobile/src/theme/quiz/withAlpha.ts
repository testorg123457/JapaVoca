/**
 * '#RRGGBB' + 투명도 → 'rgba(r,g,b,a)'. 테마 base 색에서 틴트 배경/보더를 파생할 때 사용.
 * 입력이 6자리 hex가 아니면(이미 rgba 등) 그대로 반환한다.
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) { return hex; }
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
