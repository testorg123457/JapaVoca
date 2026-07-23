/**
 * 커스텀 테마 — 사용자가 고른 사진을 잠금화면 퀴즈 배경으로 쓴다.
 *
 * 배경이 무엇일지 알 수 없으므로 가독성 장치를 두 겹 둔다.
 *  1) 사진 전체를 덮는 어두운 막(overlay) — 밝은 사진에서 글자가 날아가는 걸 막는다.
 *  2) 문제 + 선택지를 함께 감싸는 패널(contentPanel) — 무늬가 복잡한 사진에서도
 *     내용 영역만은 평평한 면 위에 놓이게 한다.
 *
 * 색은 앱 디자인 시스템 값을 쓴다(잉크 그레이 + 민트 브랜드 + 캐시 옐로).
 */
import { defineQuizTheme, type QuizTheme } from '../contract';

export const CUSTOM_THEME_ID = 'custom';

/** 사진 위에 까는 어두운 막. 이보다 옅으면 밝은 사진에서 흰 글자가 안 읽힌다. */
export const PHOTO_DIM = 'rgba(12,14,20,0.52)';

export default defineQuizTheme({
  id: CUSTOM_THEME_ID,
  name: '내 사진',
  scheme: 'dark',
  unlock: { kind: 'free' },
  colors: {
    bg: '#14161C',
    surface: '#1E2129',
    surfaceAlt: '#2A2E39',
    line: 'rgba(255,255,255,0.12)',
    textPrimary: '#F2F4F8',
    textSecondary: '#A7AEBC',
    textTertiary: '#6B7383',
    brand: '#4DB882', // mint[300] — 앱 브랜드 계열
    brandSoft: '#90D4B0', // mint[200]
    onBrand: '#08150F',
    correct: '#46D08A',
    wrong: '#FF6B6B',
    amber: '#FFCE00', // 캐시 옐로
  },
  shape: {
    radius: { choice: 16, card: 14, button: 16 },
    choiceStyle: 'fill',
    choiceLayout: 'grid2x2',
    borderWidth: 1,
    // 패널이 문제까지 감싸므로 문제 전용 스크림은 겹쳐 쓰지 않는다.
    needsTextScrim: false,
    contentPanel: true,
    background: { kind: 'image', source: { uri: '' }, overlay: PHOTO_DIM },
  },
});

/**
 * 저장된 사진 URI를 테마에 주입한다.
 *
 * 커스텀 테마가 아니면 그대로 두고, 사진이 아직 없으면 단색 배경으로 폴백한다
 * (빈 uri를 그대로 넘기면 배경이 통째로 비어 글자만 뜬다).
 * ⚠️ 순수함수 — 테스트 있음(`__tests__/quizTheme.custom.test.ts`).
 */
export function applyCustomPhoto(theme: QuizTheme, uri: string | undefined | null): QuizTheme {
  if (theme.id !== CUSTOM_THEME_ID) {
    return theme;
  }
  if (!uri) {
    return {
      ...theme,
      shape: { ...theme.shape, background: { kind: 'solid' }, contentPanel: false },
    };
  }
  return {
    ...theme,
    shape: {
      ...theme.shape,
      background: { kind: 'image', source: { uri }, overlay: PHOTO_DIM },
    },
  };
}
