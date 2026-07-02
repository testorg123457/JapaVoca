import { defineQuizTheme } from '../contract';

/** 화이트/크림 감성 배경 + 웜 잉크 포인트. 이미지 배경 라이트 테마. */
export default defineQuizTheme({
  id: 'linen',
  name: '화이트',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#EDEAE4',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F1EB',
    line: 'rgba(0,0,0,0.06)',
    textPrimary: '#2A2723',
    textSecondary: '#5B564E',
    textTertiary: '#8A847A',
    brand: '#4A453E',
    brandSoft: '#6E675C',
    onBrand: '#FFFFFF',
    correct: '#2AA96A',
    wrong: '#DC4436',
    amber: '#E0A100',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    needsTextScrim: true,
    background: {
      kind: 'image',
      source: require('../../../assets/themes/linen-bg.jpg'),
      overlay: 'rgba(255,255,255,0.20)',
    },
  },
});
