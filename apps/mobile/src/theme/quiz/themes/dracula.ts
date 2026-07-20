import { defineQuizTheme } from '../contract';

/** 드라큘라 — Dracula 팔레트 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'dracula',
  name: '드라큘라',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#282A36',
    surface: '#44475A',
    surfaceAlt: '#6272A4',
    line: '#6272A4',
    textPrimary: '#FFFFFF',
    textSecondary: '#C7CBE0',
    textTertiary: '#8A93B8',
    brand: '#BD93F9',
    brandSoft: '#D6BBFB',
    onBrand: '#282A36',
    correct: '#50FA7B',
    wrong: '#FF5555',
    amber: '#FFB86C',
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
