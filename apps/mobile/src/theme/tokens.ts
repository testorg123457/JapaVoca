/**
 * Design tokens — single source of truth.
 *
 * "Arco Design Mobile" 풍 테마: 채도 낮은 뉴트럴 그레이 베이스 + 선명한 단색 블루
 * 포인트 하나. 깨끗한 화이트(라이트)/차콜(다크), 얇고 옅은 구분선, 그림자 거의 없음,
 * 과하지 않은 라운드, 또렷한 타이포 위계. 폰트는 Pretendard.
 *
 * 구조는 2-tier:
 *   1) primitives — 색 스케일 자체(blue/gray/amber/red). 모드 무관 고정.
 *   2) semantic   — primitive를 역할에 매핑(light/dark 두 세트). 컴포넌트는 이것만 참조.
 *
 * 다크 모드는 semantic 매핑 한 곳(여기)만 바꾸면 전체가 따라온다.
 * - className(NativeWind): tailwind.config.ts가 이 토큰의 css 변수명을 참조하고,
 *   ThemeProvider가 useColorScheme 기준으로 css 변수 값을 주입한다.
 * - 인라인 스타일(TS): useThemeColors() 훅(ThemeProvider.tsx)이 semantic 세트를 반환.
 *
 * ⚠️ 이 파일은 NativeWind(tailwind.config.ts)가 node 환경에서 import 하므로
 *    react-native / nativewind 를 import 하지 않는다(순수 데이터만).
 * ⚠️ 색·간격·라운드는 여기서만 정의(하드코딩 금지).
 */

/* ─────────────────────────────────────────────────────────────────────────
 * 1) PRIMITIVES — 색 스케일 (모드 무관 고정)
 * ──────────────────────────────────────────────────────────────────────── */
export const primitives = {
  // Brand Blue (포인트 단색) — 500이 메인
  blue: {
    50: '#E6F1FB',
    100: '#B5D4F4',
    200: '#85B7EB',
    300: '#5BA0E4',
    400: '#378ADD',
    500: '#185FA5', // 메인 포인트
    600: '#0C447C',
    700: '#073A6B',
    800: '#042C53',
    900: '#02203D',
  },
  // Neutral Gray (배경/텍스트/보더) — 채도 거의 없음
  gray: {
    50: '#F7F8FA',
    100: '#F2F3F5',
    200: '#E5E6EB',
    300: '#C9CDD4',
    400: '#A9AEB8',
    500: '#86909C',
    600: '#6B7785',
    700: '#4E5969',
    800: '#272E3B',
    900: '#1D2129',
  },
  // Amber (출석 불꽃/강조) — 절제
  amber: {
    50: '#FBF1E0',
    100: '#F6E0BC',
    400: '#D98C1F',
    500: '#BA7517',
    600: '#8F5A12',
  },
  // Red (오답/위험) — 절제
  red: {
    50: '#FDECEC',
    100: '#F9CFCF',
    400: '#F0696D',
    500: '#E5484D',
    600: '#C53B3F',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/* ─────────────────────────────────────────────────────────────────────────
 * 2) SEMANTIC — 역할 매핑 (light / dark)
 *
 * 키 = className용 색 토큰명(= css 변수명 `--color-<key>`).
 * NativeWind className 예: bg-bg-primary / text-text-secondary / border-border-tertiary
 * (기존 컨벤션과 동일하게 flat 네이밍 + 더블 prefix 허용)
 * ──────────────────────────────────────────────────────────────────────── */
type SemanticSet = Record<string, string>;

const lightSemantic = {
  // 배경
  'bg-primary': primitives.white, // 메인 면(화이트)
  'bg-secondary': primitives.gray[50], // 화면 베이스/섹션 뒤
  'bg-tertiary': primitives.gray[100], // 미묘한 구분 면
  // 텍스트
  'text-primary': primitives.gray[900],
  'text-secondary': primitives.gray[700],
  'text-tertiary': primitives.gray[500],
  // 보더
  'border-tertiary': '#EEF0F3', // 0.5px 아주 옅은 선
  'border-secondary': primitives.gray[200],
  // 브랜드
  brand: primitives.blue[500],
  'brand-subtle': primitives.blue[50], // 연한 블루 배경 틴트
  'on-brand': primitives.white, // 블루 면 위 텍스트
  // 보조색(절제)
  amber: primitives.amber[500],
  'amber-subtle': primitives.amber[50],
  danger: primitives.red[500],
  'danger-subtle': primitives.red[50],

  /* ── 백워드 호환 별칭 (기존 화면/컴포넌트 className·colors.* 키) ── */
  bg: primitives.white,
  surface: primitives.gray[50],
  border: primitives.gray[200],
  'text-strong': primitives.gray[900],
  text: primitives.gray[700],
  'text-weak': primitives.gray[500],
  'brand-dark': primitives.blue[600],
  'brand-soft': primitives.blue[50],
  success: primitives.blue[500], // Arco: 정답=브랜드 블루(녹색 미사용)
  warning: primitives.amber[500],
  gold: primitives.amber[500], // 코인/캐시 표현
} as const satisfies SemanticSet;

const darkSemantic = {
  // 배경 — 차콜
  'bg-primary': '#1A1B1E',
  'bg-secondary': '#232427',
  'bg-tertiary': '#2E2F33',
  // 텍스트 — 옅게
  'text-primary': primitives.gray[100],
  'text-secondary': primitives.gray[300],
  'text-tertiary': primitives.gray[500],
  // 보더
  'border-tertiary': '#2A2B2F',
  'border-secondary': '#3A3B40',
  // 브랜드 — 다크에선 대비 위해 한 단계 밝게
  brand: primitives.blue[400],
  'brand-subtle': primitives.blue[800], // 연한 블루 배경 → 800 톤
  'on-brand': primitives.white,
  // 보조색
  amber: primitives.amber[400],
  'amber-subtle': '#3A2C12',
  danger: primitives.red[400],
  'danger-subtle': '#3A1F20',

  /* ── 백워드 호환 별칭 ── */
  bg: '#1A1B1E',
  surface: '#232427',
  border: '#3A3B40',
  'text-strong': primitives.gray[100],
  text: primitives.gray[300],
  'text-weak': primitives.gray[500],
  'brand-dark': primitives.blue[600],
  'brand-soft': primitives.blue[800],
  success: primitives.blue[400],
  warning: primitives.amber[400],
  gold: primitives.amber[400],
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
 * 라운드 — 과하지 않게. 카드 12~14, 작은 요소 8, pill 999.
 * ──────────────────────────────────────────────────────────────────────── */
export const radius = {
  sm: 8, // 칩/작은 요소
  md: 10,
  lg: 12, // 버튼 기본
  xl: 14, // 카드
  pill: 999,
} as const;

/** 간격 — 넉넉하게. 화면 좌우 기본 20, 섹션 간격 24~32. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

/**
 * 그림자 — 아주 은은한 1단계만(Arco는 그림자 거의 없음).
 * 대부분의 면은 0.5px 보더로 구분하고, 그림자는 떠 있는 요소에만 최소로.
 */
export const shadow = {
  card: { color: primitives.gray[900], opacity: 0.04, radius: 8, offsetY: 2, elevation: 1 },
  float: { color: primitives.gray[900], opacity: 0.08, radius: 16, offsetY: 6, elevation: 3 },
} as const;

/**
 * 타이포 — 폰트: Pretendard (Regular/Medium/SemiBold/Bold).
 * 위계 또렷하게(size/weight/lineHeight), 자간 살짝 좁게.
 */
export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontFamily: fontFamily.bold, letterSpacing: -0.4 }, // 큰 숫자(캐시 잔액)
  title: { fontSize: 20, lineHeight: 28, fontFamily: fontFamily.semibold, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 24, fontFamily: fontFamily.semibold, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.regular, letterSpacing: -0.2 },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular, letterSpacing: -0.1 },
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
  semantic,
  colors,
  radius,
  spacing,
  shadow,
  fontFamily,
  typography,
  hairline,
} as const;

export type Tokens = typeof tokens;
export default tokens;
