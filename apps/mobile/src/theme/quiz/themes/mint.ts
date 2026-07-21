import { defineQuizTheme } from '../contract';

/** 민트 — 차콜 바탕에 브라이트 민트 포인트인 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'mint',
  name: '민트',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#2C302E',
    surface: '#474A48',
    surfaceAlt: '#6C706C',
    line: '#909590',
    textPrimary: '#FFFFFF',
    textSecondary: '#B5B7B6',
    textTertiary: '#8B8D8C',
    brand: '#9AE19D',
    brandSoft: '#B8EABA',
    onBrand: '#000000',
    correct: '#537A5A',
    wrong: '#E0776E',
    amber: '#CBA76B',
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
