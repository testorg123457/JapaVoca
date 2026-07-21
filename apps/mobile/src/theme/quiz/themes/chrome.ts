import { defineQuizTheme } from '../contract';

/** 폴리시드 크롬 — 슬레이트 그레이스케일 단색 라이트(배경 이미지 없음). 브랜드색 없이 그라파이트로 액션 표시. */
export default defineQuizTheme({
  id: 'chrome',
  name: '폴리시드 크롬',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#F8FAFC',
    surface: '#E2E8F0',
    surfaceAlt: '#D6DEE8',
    line: '#CBD5E1',
    textPrimary: '#000000',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    brand: '#020617',
    brandSoft: '#C0C1C5',
    onBrand: '#FFFFFF',
    correct: '#10B981',
    wrong: '#E11D48',
    amber: '#F59E0B',
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
