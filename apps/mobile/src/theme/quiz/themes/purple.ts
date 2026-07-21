import { defineQuizTheme } from '../contract';

/** 퍼플 — 딥블루 바탕에 비비드 퍼플 포인트인 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'purple',
  name: '퍼플',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#10288C',
    surface: '#292DA9',
    surfaceAlt: '#3830BB',
    line: 'rgba(255,255,255,0.12)',
    textPrimary: '#FFFFFF',
    textSecondary: '#ABB4D7',
    textTertiary: '#7C89C0',
    brand: '#6338EE',
    brandSoft: '#EAF6AD',
    onBrand: '#FFFFFF',
    correct: '#B6DB00',
    wrong: '#FF5C7A',
    amber: '#FFD166',
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
