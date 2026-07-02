import { defineQuizTheme } from '../contract';

/** 다크그레이 배경(바트) + 오렌지 포인트. 이미지 배경 다크 테마. */
export default defineQuizTheme({
  id: 'charcoal',
  name: '다크그레이',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#3A393E',
    surface: '#2B2A30',
    surfaceAlt: '#35343B',
    line: 'rgba(255,255,255,0.08)',
    textPrimary: '#F2F1F4',
    textSecondary: '#BAB8C0',
    textTertiary: '#87848D',
    brand: '#F7971E',
    brandSoft: '#FFB559',
    onBrand: '#241800',
    correct: '#3AD07E',
    wrong: '#FF6B57',
    amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 16, card: 16, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    needsTextScrim: false,
    background: {
      kind: 'image',
      source: require('../../../assets/themes/charcoal-bg.jpg'),
      overlay: 'rgba(26,25,30,0.34)',
    },
  },
});
