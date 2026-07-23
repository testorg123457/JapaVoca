import { applyCustomPhoto, CUSTOM_THEME_ID, PHOTO_DIM } from '../src/theme/quiz/themes/custom';
import classic from '../src/theme/quiz/themes/classic';
import customTheme from '../src/theme/quiz/themes/custom';
import { getTheme, themeList } from '../src/theme/quiz/themes';

describe('커스텀 테마', () => {
  it('테마 목록·조회에 등록돼 있다', () => {
    expect(themeList.some((t) => t.id === CUSTOM_THEME_ID)).toBe(true);
    expect(getTheme(CUSTOM_THEME_ID).id).toBe(CUSTOM_THEME_ID);
  });

  it('사진 URI를 배경으로 주입한다', () => {
    const t = applyCustomPhoto(customTheme, 'file:///photo.jpg');
    expect(t.shape.background).toEqual({
      kind: 'image',
      source: { uri: 'file:///photo.jpg' },
      overlay: PHOTO_DIM,
    });
  });

  it('사진 위에는 항상 어두운 막을 깐다 — 밝은 사진에서 글자가 날아가지 않게', () => {
    const bg = applyCustomPhoto(customTheme, 'file:///x.jpg').shape.background;
    expect(bg.kind).toBe('image');
    if (bg.kind === 'image') {
      expect(bg.overlay).toBeTruthy();
    }
  });

  it('문제와 선택지를 감싸는 패널을 켠다', () => {
    expect(applyCustomPhoto(customTheme, 'file:///x.jpg').shape.contentPanel).toBe(true);
  });

  it('패널을 쓰므로 문제 전용 스크림은 겹쳐 쓰지 않는다', () => {
    expect(customTheme.shape.needsTextScrim).toBe(false);
  });

  it('사진이 없으면 단색 배경으로 폴백하고 패널도 끈다', () => {
    for (const empty of [undefined, null, '']) {
      const t = applyCustomPhoto(customTheme, empty);
      expect(t.shape.background).toEqual({ kind: 'solid' });
      expect(t.shape.contentPanel).toBe(false);
    }
  });

  it('다른 테마는 건드리지 않는다', () => {
    expect(applyCustomPhoto(classic, 'file:///x.jpg')).toBe(classic);
    expect(applyCustomPhoto(classic, undefined)).toBe(classic);
  });

  it('원본 테마 객체를 변형하지 않는다', () => {
    const before = JSON.stringify(customTheme.shape.background);
    applyCustomPhoto(customTheme, 'file:///y.jpg');
    expect(JSON.stringify(customTheme.shape.background)).toBe(before);
  });

  it('선택지 면은 불투명색 — 사진이 비쳐 글자가 흐려지면 안 된다', () => {
    expect(customTheme.colors.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
