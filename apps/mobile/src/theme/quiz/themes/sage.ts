import { defineQuizTheme } from '../contract';

/** 세이지 그레이 — 차분한 세이지 그린 포인트의 단색 다크(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'sage',
  name: '세이지 그레이',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#1B1D1C',
    surface: '#242726',
    surfaceAlt: '#3A3E3B',
    // 선택지 테두리로도 쓰이므로(choiceOutline) 배경보다 또렷한 밝은 세이지그레이.
    line: '#48514C',
    textPrimary: '#FFFFFF',
    textSecondary: '#C2CAC4',
    textTertiary: '#828C85',
    brand: '#8FB39C',
    brandSoft: '#A9C7B4',
    onBrand: '#1B1D1C',
    correct: '#7FC8A0',
    wrong: '#E27878',
    amber: '#D9B36B',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1.5,
    choiceOutline: true,
    needsTextScrim: false,
    background: { kind: 'solid' },
  },
});
