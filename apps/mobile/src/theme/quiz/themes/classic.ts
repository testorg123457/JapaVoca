import { defineQuizTheme } from '../contract';

/** 현재 잠금화면 디자인(다크 글로우). 기본 테마. */
export default defineQuizTheme({
  id: 'classic',
  name: '클래식',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#0C0D10',
    surface: '#1E222A',
    surfaceAlt: '#252930',
    line: 'rgba(255,255,255,0.07)',
    textPrimary: '#EDEEF0',
    textSecondary: '#9A9EA7',
    textTertiary: '#6A6E78',
    brand: '#35B98A',
    brandSoft: '#7FE6BE',
    onBrand: '#FFFFFF',
    correct: '#33C97A',
    wrong: '#FF5A45',
    amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    background: { kind: 'glow', glow: '#1F9660' },
  },
});
