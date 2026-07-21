import { defineQuizTheme } from '../contract';

/** 고급 — 다크 플럼 바탕에 버건디·로즈골드 포인트인 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'luxury',
  name: '고급',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#473144',
    surface: '#5B4551',
    surfaceAlt: '#6C565C',
    line: '#836D6B',
    textPrimary: '#FFFFFF',
    textSecondary: '#BFB7BE',
    textTertiary: '#9A8E98',
    brand: '#AF1B3F',
    brandSoft: '#EFC69B',
    onBrand: '#FFFFFF',
    correct: '#4C9A6D',
    wrong: '#E14B62',
    amber: '#DF9B6D',
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
