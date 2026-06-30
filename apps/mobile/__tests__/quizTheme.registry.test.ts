import {
  DEFAULT_THEME_ID, themeList, themesById, getTheme, resolveThemeId,
} from '../src/theme/quiz/themes';

describe('quiz theme registry', () => {
  it('classic/paper 둘 다 등록', () => {
    expect(themesById.classic).toBeDefined();
    expect(themesById.paper).toBeDefined();
    expect(themeList.map((t) => t.id)).toEqual(['classic', 'paper']);
  });
  it('기본 테마는 classic', () => {
    expect(DEFAULT_THEME_ID).toBe('classic');
    expect(getTheme('없는id').id).toBe('classic');
  });
  it('resolveThemeId: 유효하면 그대로, 아니면 classic', () => {
    expect(resolveThemeId('paper')).toBe('paper');
    expect(resolveThemeId('xxx')).toBe('classic');
    expect(resolveThemeId(undefined)).toBe('classic');
  });
  it('모든 테마는 13개 색 역할을 채운다', () => {
    const keys = ['bg','surface','surfaceAlt','line','textPrimary','textSecondary','textTertiary','brand','brandSoft','onBrand','correct','wrong','amber'];
    for (const t of themeList) {
      for (const k of keys) {
        expect(typeof (t.colors as Record<string, string>)[k]).toBe('string');
      }
    }
  });
});
