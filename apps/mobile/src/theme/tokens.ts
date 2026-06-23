/**
 * Design tokens — single source of truth.
 *
 * "토스st" 테마: 부드럽고 둥근 한국형 리워드 앱 룩.
 * 이 파일이 디자인 토큰의 단일 소스입니다.
 * NativeWind(tailwind.config.ts)와 공용 컴포넌트(src/components/)가 모두 이 값을
 * 참조합니다. 값은 여기서만 바꾸세요.
 */

export const colors = {
  // Brand — 포인트는 여기에만
  brand: '#3B82F6', // 메인 (신뢰감 있는 블루)
  brandDark: '#2563EB',
  brandSoft: '#EBF2FF', // 메인의 옅은 배경 틴트

  // Semantic
  success: '#16A34A', // 캐시 적립 / 정답
  danger: '#EF4444', // 오답 / 차감
  warning: '#F59E0B', // 잭팟/강조 (캐시 골드 느낌)
  gold: '#FFB020', // 캐시/코인 표현용

  // Grayscale — 배경 / 텍스트
  bg: '#FFFFFF',
  surface: '#F7F8FA', // 카드 뒷배경, 섹션 구분
  border: '#ECEEF1',
  textStrong: '#191F28', // 토스 느낌의 진한 잉크블랙
  text: '#4E5968',
  textWeak: '#8B95A1',
} as const;

/**
 * 라운드 — 토스st 핵심, 큼직하게.
 * 버튼/카드/인풋 기본은 md~lg 사용. 아이콘버튼/아바타는 pill.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** 간격 — 넉넉하게. 화면 좌우 기본 패딩 20, 섹션 간격 24~32. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

/** 그림자 — 부드럽게(큰 blur, 낮은 opacity). */
export const shadow = {
  card: { color: '#191F28', opacity: 0.06, radius: 16, offsetY: 4, elevation: 2 },
  float: { color: '#191F28', opacity: 0.1, radius: 24, offsetY: 8, elevation: 4 },
} as const;

/**
 * 타이포 — 폰트: Pretendard (Regular/Medium/SemiBold/Bold).
 * 폰트 파일은 assets/fonts/에 추가 후 링크해야 합니다(README 참고).
 */
export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const typography = {
  display: { fontSize: 28, fontFamily: fontFamily.bold, letterSpacing: -0.3 }, // 큰 숫자(캐시 잔액)
  title: { fontSize: 20, fontFamily: fontFamily.semibold, letterSpacing: -0.3 },
  body: { fontSize: 15, fontFamily: fontFamily.regular, letterSpacing: -0.2 },
  caption: { fontSize: 13, fontFamily: fontFamily.regular, letterSpacing: -0.2 }, // textWeak 색
} as const;

/** React Native 스타일로 변환된 그림자 헬퍼. */
export function shadowStyle(token: keyof typeof shadow) {
  const s = shadow[token];
  return {
    shadowColor: s.color,
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
    shadowOffset: { width: 0, height: s.offsetY },
    elevation: s.elevation,
  };
}

export const tokens = {
  colors,
  radius,
  spacing,
  shadow,
  fontFamily,
  typography,
} as const;

export type Tokens = typeof tokens;
export default tokens;
