import { defineQuizTheme } from '../contract';

/** 기본 잠금화면 테마 — 인디고 다크(단색 배경, 그라데이션 없음). */
export default defineQuizTheme({
  id: 'classic',
  name: '인디고',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#16181F',
    surface: '#2A3040',
    surfaceAlt: '#353C4E',
    line: 'rgba(255,255,255,0.09)',
    textPrimary: '#E9ECF2',
    textSecondary: '#9BA3B4',
    textTertiary: '#5E6678',
    brand: '#7C9EFF',
    brandSoft: '#A8BEFF',
    onBrand: '#10131C',
    correct: '#46D08A',
    wrong: '#FF6B6B',
    amber: '#FFCE00',
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
