import { boxGradeStyle } from '../src/screens/quiz/boxGradeStyle';
import { primitives } from '../src/theme/tokens';

describe('boxGradeStyle', () => {
  it('일반 상자는 등급 뱃지 없이 민트 연출', () => {
    const s = boxGradeStyle('normal');
    expect(s.badge).toBeNull();
    expect(s.bg).toBe(primitives.mint[900]);
  });

  it('보라 상자는 보라 배경 + 뱃지', () => {
    const s = boxGradeStyle('purple');
    expect(s.bg).toBe('#2A2440');
    expect(s.badge?.label).toBe('✦ 보라 상자');
  });

  it('버건디 상자는 radial 배경 + 와인 뱃지', () => {
    const s = boxGradeStyle('burgundy');
    expect(s.bg).toBe('#07070A');
    expect(s.badge?.label).toBe('✦ 버건디 상자');
    expect(s.badge?.text).toBe(primitives.burgundy[300]);
    expect(s.backdrop.kind).toBe('radial');
  });

  it('버건디만 radial 배경 — 아래 등급과 격을 벌린다', () => {
    expect(boxGradeStyle('normal').backdrop.kind).toBe('glow');
    expect(boxGradeStyle('purple').backdrop.kind).toBe('glow');
  });

  it('radial stop은 offset 오름차순이고 바깥 끝은 투명', () => {
    const b = boxGradeStyle('burgundy').backdrop;
    if (b.kind !== 'radial') { throw new Error('radial이어야 함'); }
    const offsets = b.stops.map((s) => s.offset);
    expect([...offsets].sort((a, z) => a - z)).toEqual(offsets);
    expect(b.stops[b.stops.length - 1].opacity).toBe(0);
  });

  it('버건디 배경은 다른 등급보다 어둡다 — 와인빛만 뜨게', () => {
    const lum = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(lum(boxGradeStyle('burgundy').bg)).toBeLessThan(lum(boxGradeStyle('purple').bg));
    expect(lum(boxGradeStyle('burgundy').bg)).toBeLessThan(lum(boxGradeStyle('normal').bg));
  });

  it('등급마다 Lottie 소스가 서로 다르다', () => {
    const anims = [boxGradeStyle('normal'), boxGradeStyle('purple'), boxGradeStyle('burgundy')]
      .map((s) => s.anim);
    expect(new Set(anims).size).toBe(3);
  });

  it('모르는 등급(서버가 먼저 나간 경우)은 일반으로 폴백', () => {
    expect(boxGradeStyle('diamond')).toBe(boxGradeStyle('normal'));
  });
});
