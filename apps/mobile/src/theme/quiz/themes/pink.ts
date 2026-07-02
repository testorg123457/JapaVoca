import { defineQuizTheme } from '../contract';

/** 핑크 감성 배경(샐리) + 핑크 포인트. 이미지 배경 라이트 테마. */
export default defineQuizTheme({
  id: 'pink',
  name: '핑크',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#F0C6CE',
    surface: '#FFFFFF',
    surfaceAlt: '#FBEDF0',
    line: 'rgba(0,0,0,0.05)',
    textPrimary: '#3A2129',
    textSecondary: '#6B4A54',
    textTertiary: '#9A7B84',
    brand: '#E45E86',
    brandSoft: '#F286A6',
    onBrand: '#FFFFFF',
    correct: '#2FA85E',
    wrong: '#D63A46',
    amber: '#F2A400',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    needsTextScrim: true,
    background: {
      kind: 'image',
      source: require('../../../assets/themes/pink-bg.jpg'),
      overlay: 'rgba(255,255,255,0.16)',
    },
  },
});
