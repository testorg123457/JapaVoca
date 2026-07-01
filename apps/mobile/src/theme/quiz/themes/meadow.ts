import { defineQuizTheme } from '../contract';

/** 연두 초원 배경(마크) + 그린 포인트. 이미지 배경 라이트 테마. */
export default defineQuizTheme({
  id: 'meadow',
  name: '연두',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#8FB94E',
    surface: '#FFFFFF',
    surfaceAlt: '#EFF5E6',
    line: 'rgba(0,0,0,0.06)',
    textPrimary: '#1E2A16',
    textSecondary: '#4C5A3E',
    textTertiary: '#74806A',
    brand: '#5CA524',
    brandSoft: '#7DC13F',
    onBrand: '#FFFFFF',
    correct: '#2FA85E',
    wrong: '#E8432D',
    amber: '#F2A400',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'soft',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    background: {
      kind: 'image',
      source: require('../../../assets/themes/meadow-bg.jpg'),
      overlay: 'rgba(255,255,255,0.14)',
    },
  },
});
