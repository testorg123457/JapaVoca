/**
 * Design tokens — single source of truth.
 *
 * "배달의민족(배시시)" 풍 디자인 시스템 기반(라이브러리 미사용 — 토큰·스타일만 차용).
 * - 포인트: 배민 민트 brand-400 `#2AC1BC` (버튼/활성탭/강조).
 * - 보조: 옐로 yellow-400 `#FFCE00` (배지/캐시/리워드 강조).
 * - 뉴트럴: 배민 특유의 따뜻한 그레이(#F8F8F8 배경 → #191919 텍스트).
 * - 적당히 둥근 라운드(버튼 12 / 카드 16), 약간 무게감 있는 그림자, Pretendard.
 *
 * 구조는 2-tier:
 *   1) primitives — 색 스케일 자체(brand/yellow/gray + danger/info). 모드 무관 고정.
 *   2) semantic   — primitive를 역할에 매핑(light/dark 두 세트). 컴포넌트는 이것만 참조.
 *
 * 다크 모드는 semantic 매핑 한 곳(여기)만 바꾸면 전체가 따라온다.
 * - className(NativeWind): tailwind.config.ts가 이 토큰의 css 변수명 + raw 팔레트를 참조.
 *   semantic 값은 ThemeProvider가 useColorScheme 기준으로 css 변수로 주입한다.
 * - 인라인 스타일(TS): useThemeColors() 훅(ThemeProvider.tsx)이 semantic 세트를 반환.
 *
 * ⚠️ light/dark 두 세트는 키 집합이 동일해야 한다(ThemeProvider가 둘 중 하나를 주입).
 * ⚠️ 이 파일은 NativeWind(tailwind.config.ts)가 node 환경에서 import 하므로
 *    react-native / nativewind 를 import 하지 않는다(순수 데이터만).
 * ⚠️ 색·간격·라운드는 여기서만 정의(하드코딩 금지).
 */

/* ─────────────────────────────────────────────────────────────────────────
 * 1) PRIMITIVES — 색 스케일 (모드 무관 고정)
 * ──────────────────────────────────────────────────────────────────────── */

/** 배민 민트 (Primary). 400이 메인 포인트. */
export const brand = {
  50: '#E6FAF9',
  100: '#B3F0ED',
  200: '#80E6E1',
  300: '#4DD9D3',
  400: '#2AC1BC', // 메인 포인트(버튼/활성탭/강조)
  500: '#1DA8A3', // 눌린 상태/진한 강조
  600: '#0F8A85',
} as const;

/** 옐로 (Secondary) — 배지/캐시/리워드 강조. */
export const yellow = {
  300: '#FFE566',
  400: '#FFCE00', // 캐시/리워드 메인
  500: '#E6B800',
} as const;

/** 따뜻한 뉴트럴 그레이. 0=흰색 … 900=기본 텍스트. */
export const gray = {
  0: '#FFFFFF',
  50: '#F8F8F8', // 앱 기본 배경
  100: '#F0F0F0',
  200: '#E0E0E0',
  300: '#C8C8C8',
  400: '#ABABAB',
  500: '#888888',
  600: '#666666',
  700: '#444444',
  800: '#2C2C2C',
  900: '#191919', // 기본 텍스트
} as const;

export const primitives = {
  brand,
  yellow,
  gray,
  // 단색 기능색(스케일 불필요) — 500=메인, 50=옅은 배경
  red: { 50: '#FFF0F0', 500: '#FF585D' }, // danger
  blue: { 50: '#EBF4FF', 500: '#4A90E2' }, // info
  white: '#FFFFFF',
  black: '#000000',
} as const;

/* ─────────────────────────────────────────────────────────────────────────
 * 2) SEMANTIC — 역할 매핑 (light / dark)
 *
 * 키 = className용 색 토큰명(= css 변수명 `--color-<key>`).
 * NativeWind className 예: bg-bg-primary / text-text-secondary / border-border-secondary / bg-brand
 * ──────────────────────────────────────────────────────────────────────── */
type SemanticSet = Record<string, string>;

const lightSemantic = {
  // 배경
  'bg-primary': gray[0], // 메인 면(흰색)
  'bg-secondary': gray[50], // 앱 기본 배경
  'bg-tertiary': gray[100], // 미묘한 구분 면
  // 텍스트
  'text-primary': gray[900],
  'text-secondary': gray[600],
  'text-tertiary': gray[500],
  // 보더
  'border-tertiary': gray[100],
  'border-secondary': gray[200],
  // 브랜드 (민트)
  brand: brand[400],
  'brand-active': brand[500], // 눌림
  'brand-subtle': brand[50], // 옅은 민트 틴트
  'brand-subtle-active': brand[100],
  'on-brand': gray[0], // 민트 면 위 텍스트(흰색)
  // 기능색
  amber: yellow[400], // 캐시/리워드/출석 강조
  'amber-subtle': '#FFFBE6',
  danger: primitives.red[500],
  'danger-subtle': primitives.red[50],
  info: primitives.blue[500],
  'info-subtle': primitives.blue[50],

  /* ── 백워드 호환 별칭 (기존 화면/컴포넌트 className·colors.* 키) ── */
  bg: gray[0],
  surface: gray[50],
  border: gray[200],
  'text-strong': gray[900],
  text: gray[600],
  'text-weak': gray[500],
  'brand-dark': brand[600],
  'brand-soft': brand[50],
  success: brand[400], // 배시시: 성공 = 브랜드 민트 계열
  'success-subtle': brand[50],
  warning: yellow[400],
  'warning-subtle': '#FFFBE6',
  gold: yellow[400], // 코인/캐시 표현
  'gold-subtle': '#FFFBE6',
} as const satisfies SemanticSet;

const darkSemantic = {
  // 배경 — 다크 그레이
  'bg-primary': '#1F1F1F',
  'bg-secondary': '#191919',
  'bg-tertiary': '#2C2C2C',
  // 텍스트
  'text-primary': gray[100],
  'text-secondary': gray[400],
  'text-tertiary': gray[500],
  // 보더
  'border-tertiary': '#2C2C2C',
  'border-secondary': '#444444',
  // 브랜드 — 다크에선 밝은 민트
  brand: brand[300],
  'brand-active': brand[200],
  'brand-subtle': '#10403E',
  'brand-subtle-active': '#155753',
  'on-brand': gray[900], // 밝은 민트 면 위는 어두운 텍스트
  // 기능색
  amber: yellow[400],
  'amber-subtle': '#3A330F',
  danger: '#FF7176',
  'danger-subtle': '#3A1B1C',
  info: '#6AA6E8',
  'info-subtle': '#11243A',

  /* ── 백워드 호환 별칭 ── */
  bg: '#191919',
  surface: '#1F1F1F',
  border: '#444444',
  'text-strong': gray[100],
  text: gray[400],
  'text-weak': gray[500],
  'brand-dark': brand[200],
  'brand-soft': '#10403E',
  success: brand[300],
  'success-subtle': '#10403E',
  warning: yellow[400],
  'warning-subtle': '#3A330F',
  gold: yellow[400],
  'gold-subtle': '#3A330F',
} as const satisfies SemanticSet;

export const semantic = {
  light: lightSemantic,
  dark: darkSemantic,
} as const;

export type ColorScheme = keyof typeof semantic;
export type SemanticColorToken = keyof typeof lightSemantic;

/** css 변수명 = `--color-<토큰명>`. tailwind.config / ThemeProvider 공용. */
export const colorVarName = (token: string) => `--color-${token}`;

/** tailwind.config용: 토큰명 → `var(--color-<token>)` 문자열 맵. */
export const cssVarColors = Object.fromEntries(
  (Object.keys(lightSemantic) as SemanticColorToken[]).map((token) => [
    token,
    `var(${colorVarName(token)})`,
  ]),
) as Record<SemanticColorToken, string>;

/**
 * 백워드 호환 `colors` — 기존 TS 코드가 `colors.brand` 식으로 직접 쓰는 인라인 색.
 * 라이트 모드 값 기준(스크린 전반 호환). 다크 대응이 필요한 곳은 useThemeColors() 사용.
 */
export const colors = {
  brand: lightSemantic.brand,
  brandDark: lightSemantic['brand-dark'],
  brandSoft: lightSemantic['brand-soft'],
  success: lightSemantic.success,
  danger: lightSemantic.danger,
  warning: lightSemantic.warning,
  gold: lightSemantic.gold,
  bg: lightSemantic.bg,
  surface: lightSemantic.surface,
  border: lightSemantic.border,
  textStrong: lightSemantic['text-strong'],
  text: lightSemantic.text,
  textWeak: lightSemantic['text-weak'],
} as const;

/* ─────────────────────────────────────────────────────────────────────────
 * 라운드 — 배민식(적당히 둥글게). 인풋·태그 8 / 버튼 12 / 카드 16.
 * pill 은 full 별칭(기존 className rounded-pill 호환).
 * ──────────────────────────────────────────────────────────────────────── */
export const radius = {
  none: 0,
  xs: 4,
  sm: 8, // 인풋/태그
  md: 12, // 버튼 기본
  lg: 16, // 카드 기본
  xl: 20,
  full: 9999,
  pill: 9999, // = full (백워드 호환)
} as const;

/** 간격 — 4pt grid. */
export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
} as const;

/**
 * 그림자 — 배민식(약간 무게감). sm/md/lg 3단계.
 * 면은 보더로도 구분하되, 카드·떠 있는 요소에 단계별 그림자.
 */
export const shadow = {
  sm: { color: primitives.black, opacity: 0.08, radius: 4, offsetY: 1, elevation: 2 },
  md: { color: primitives.black, opacity: 0.1, radius: 12, offsetY: 4, elevation: 6 },
  lg: { color: primitives.black, opacity: 0.12, radius: 20, offsetY: 8, elevation: 12 },
} as const;

/**
 * 타이포 — 폰트: Pretendard (Regular 400 / Medium 500 / Bold 700).
 * 배민 한나체는 브랜드 전용이라 미적용.
 */
export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  bold: 'Pretendard-Bold',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

/** 사이즈 스케일(배민식 넉넉한 간격). lineHeight 는 절대값(px). */
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15, // body 기본
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
} as const;

export const lineHeight = {
  xs: 17, // 12 * 1.4
  sm: 18, // 13 * 1.4
  md: 22, // 15 * 1.5
  lg: 26, // 17 * 1.5
  xl: 28, // 20 * 1.4
  '2xl': 32, // 24 * 1.3
  '3xl': 34, // 28 * 1.2
  '4xl': 41, // 34 * 1.2
} as const;

/** 의미 단위 타이포 변형(AppText variant). 위 스케일을 매핑. */
export const typography = {
  display: { fontSize: fontSize['3xl'], lineHeight: lineHeight['3xl'], fontFamily: fontFamily.bold, letterSpacing: -0.4 }, // 큰 숫자(캐시 잔액)
  title: { fontSize: fontSize.xl, lineHeight: lineHeight.xl, fontFamily: fontFamily.bold, letterSpacing: -0.3 },
  heading: { fontSize: fontSize.lg, lineHeight: lineHeight.lg, fontFamily: fontFamily.bold, letterSpacing: -0.2 },
  body: { fontSize: fontSize.md, lineHeight: lineHeight.md, fontFamily: fontFamily.regular, letterSpacing: -0.2 },
  caption: { fontSize: fontSize.sm, lineHeight: lineHeight.sm, fontFamily: fontFamily.regular, letterSpacing: -0.1 },
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

/** 얇은 구분선용 헤어라인 두께(0.5px). */
export const hairline = 0.5;

export const tokens = {
  primitives,
  brand,
  yellow,
  gray,
  semantic,
  colors,
  radius,
  spacing,
  shadow,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  typography,
  hairline,
} as const;

export type Tokens = typeof tokens;
export default tokens;
