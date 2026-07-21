import { defineQuizTheme } from '../contract';

/** 핀테크 트러스트 — 슬레이트·인디고 단색 라이트(배경 이미지 없음). */
export default defineQuizTheme({
  id: 'fintech',
  name: '핀테크 트러스트',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#F8FAFC',
    surface: '#EFF6FF',
    surfaceAlt: '#EEF2FF',
    line: '#E2E8F0',
    textPrimary: '#000000',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    brand: '#635BFF',
    brandSoft: '#E0DEFF',
    onBrand: '#FFFFFF',
    correct: '#0D9488',
    wrong: '#DC2626',
    amber: '#C7A84B',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1.5,
    // bg/surface가 둘 다 아주 밝은 톤이라 대비가 약함 → 기본 선택지에도 line 테두리.
    choiceOutline: true,
    needsTextScrim: false,
    background: { kind: 'solid' },
  },
});
