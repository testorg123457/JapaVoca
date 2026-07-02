import { defineQuizTheme } from '../contract';

/** 푸른 하늘 배경 + 블루 포인트. 이미지 배경 라이트 테마. */
export default defineQuizTheme({
  id: 'sky',
  name: '하늘',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#2E7BC0',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF4FA',
    line: 'rgba(0,0,0,0.06)',
    textPrimary: '#14202E',
    textSecondary: '#48586A',
    textTertiary: '#6E7E90',
    brand: '#1E7FD6',
    brandSoft: '#4AA3EE',
    onBrand: '#FFFFFF',
    correct: '#22B268',
    wrong: '#E8432D',
    amber: '#FFB300',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    needsTextScrim: true,
    background: {
      kind: 'image',
      source: require('../../../assets/themes/sky-bg.jpg'),
      overlay: 'rgba(255,255,255,0.14)',
    },
  },
});
