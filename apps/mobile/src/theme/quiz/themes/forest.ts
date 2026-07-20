import { defineQuizTheme } from '../contract';

/** 연두 — Everforest 계열 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'forest',
  name: '연두',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#2D353B',
    surface: '#343F44',
    surfaceAlt: '#3D484D',
    line: '#3D484D',
    textPrimary: '#D3C6AA',
    textSecondary: '#A6B0A5',
    textTertiary: '#828F84',
    brand: '#A7C080',
    brandSoft: '#BFCF9C',
    onBrand: '#2D353B',
    correct: '#83C092',
    wrong: '#E67E80',
    amber: '#DBBC7F',
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
