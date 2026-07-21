import { defineQuizTheme } from '../contract';

/** 웜 에디토리얼 — 크림 종이 질감의 단색 라이트(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'editorial',
  name: '웜 에디토리얼',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#FAFAF8',
    surface: '#F5F0EB',
    surfaceAlt: '#E6E2DE',
    line: '#D6D3D1',
    textPrimary: '#000000',
    textSecondary: '#57534E',
    textTertiary: '#A8A29E',
    brand: '#0369A1',
    brandSoft: '#D2E4EE',
    onBrand: '#FFFFFF',
    correct: '#15803D',
    wrong: '#C2410C',
    amber: '#D97706',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1.5,
    // 크림 배경 위 크림 면이라 대비가 약함 → 기본 선택지에도 line 테두리.
    choiceOutline: true,
    needsTextScrim: false,
    background: { kind: 'solid' },
  },
});
