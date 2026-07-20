import { defineQuizTheme } from '../contract';

/** 올리브 — Gruvbox 계열 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'olive',
  name: '올리브',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#282828',
    surface: '#3C3836',
    surfaceAlt: '#504945',
    line: '#504945',
    textPrimary: '#FFFFFF',
    textSecondary: '#D5C4A1',
    textTertiary: '#A89984',
    brand: '#B8BB26',
    brandSoft: '#D3D63F',
    onBrand: '#282828',
    correct: '#8EC07C',
    wrong: '#FB4934',
    amber: '#FABD2F',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    needsTextScrim: false,
    background: { kind: 'solid' },
  },
});
