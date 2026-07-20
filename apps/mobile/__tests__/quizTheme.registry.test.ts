import {
  DEFAULT_THEME_ID, themeList, themesById, getTheme, resolveThemeId,
} from '../src/theme/quiz/themes';

describe('quiz theme registry', () => {
  it('현재 등록된 테마 목록', () => {
    expect(themesById.classic).toBeDefined();
    expect(themeList.map((t) => t.id)).toEqual([
      'classic', 'forest', 'olive', 'dracula', 'sage',
    ]);
  });
  it('기본 테마는 classic', () => {
    expect(DEFAULT_THEME_ID).toBe('classic');
    expect(getTheme('없는id').id).toBe('classic');
  });
  it('resolveThemeId: 유효하면 그대로, 아니면 classic', () => {
    expect(resolveThemeId('forest')).toBe('forest');
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
