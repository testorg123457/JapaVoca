import { defineQuizTheme } from '../contract';

/** 라이트 데모 테마. 솔리드 배경 + 소프트 선택지. */
export default defineQuizTheme({
  id: 'paper',
  name: '페이퍼',
  scheme: 'light',
  unlock: { kind: 'free' },
  colors: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F2F4',
    line: '#E5E5E8',
    textPrimary: '#1A1A1A',
    textSecondary: '#5C5C62',
    textTertiary: '#7E7E85',
    brand: '#1F9660',
    brandSoft: '#0F7048',
    onBrand: '#FFFFFF',
    correct: '#2AC171',
    wrong: '#E8432D',
    amber: '#FFCE00',
  },
  shape: {
    radius: { choice: 18, card: 18, button: 14 },
    choiceStyle: 'soft',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    background: { kind: 'solid' },
  },
});
