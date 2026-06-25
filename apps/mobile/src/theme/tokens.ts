/**
 * Design tokens — single source of truth.
 *
 * 라이브러리 미사용 — 토큰·스타일만 직접 정의.
 * - Primary: Forest Mint `#1F9660` (CTA/버튼/활성탭). 보조 강조도 같은 민트 램프의 밝은 단계.
 *   (⚠️ 프리미티브 export 이름은 하위 호환 위해 `vermilion` 그대로지만, 값은 포레스트 민트 램프다.)
 * - 경고/오답/캐시사용(−): danger 전용 Red `#E8432D` (브랜드와 분리된 기능색 → `red` 프리미티브).
 * - 캐시/리워드 전용: 옐로 yellow-400 `#FFCE00`.
 * - 텍스트: Ink gray-900 `#1A1A1A` 기본 — 메인색을 글자색으로 쓰지 않는다.
 * - 뉴트럴: 핑크 틴트 없는 그레이(#FFFFFF 흰 배경 → #1A1A1A Ink 텍스트).
 * - 적당히 둥근 라운드(버튼 14 / 카드 18), 옅고 넓게 퍼지는 그림자, Pretendard.
 *
 * 구조는 2-tier:
 *   1) primitives — 색 스케일 자체(vermilion/yellow/gray + green/blue). 모드 무관 고정.
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

/**
 * Forest Mint (Primary 브랜드 램프). 500이 메인 CTA, 600은 눌림.
 * 9 stops(800 생략) 풀 램프. 역할 정렬: 기존 semantic이 500=Primary/600=Pressed/700=강조/
 * 50·100=옅은 틴트/400=보조 민트를 참조하므로, 거기에 맞춰 민트 값을 채운다.
 * (export 이름 `vermilion`은 하위 호환용 — 실제 색은 포레스트 민트다.)
 */
export const vermilion = {
  50: '#F2FBF7',
  100: '#C8EDD8',
  200: '#90D4B0',
  300: '#4DB882',
  400: '#34A06A', // 보조 민트(coral 역할) — Primary보다 밝게
  500: '#1F9660', // Primary — 메인 CTA/버튼/활성 탭
  600: '#0F7048', // Pressed
  700: '#084D32', // 진한 강조(brand-strong)
  900: '#05311D', // 최darkest
} as const;

/** Cash Yellow — 캐시/리워드 전용 액센트. 글자용은 600(#B38F00). */
export const yellow = {
  50: '#FFFBE6',
  100: '#FFF3B0',
  200: '#FFE566',
  400: '#FFCE00', // 캐시/리워드/상자 메인
  500: '#E6B800', // Pressed
  600: '#B38F00', // 옐로 배경 없을 때 텍스트용
  700: '#7A6100',
} as const;

/** 뉴트럴 그레이(핑크 틴트 없음). 0/50=흰색(앱 배경) … 900=Ink(기본 텍스트). */
export const gray = {
  0: '#FFFFFF',
  50: '#FFFFFF', // 앱 기본 배경 — 순백
  100: '#F2F2F4', // 미묘한 구분 면/칩 배경
  200: '#E5E5E8', // 보더
  300: '#D2D2D6',
  400: '#A8A8AE',
  500: '#7E7E85',
  600: '#5C5C62',
  700: '#45454A',
  800: '#2A2A2E',
  900: '#1A1A1A', // Ink — 기본 텍스트
} as const;

/**
 * Danger Red — 경고/오답/캐시 사용(−)/로그아웃 전용. 브랜드(민트)와 분리된 기능색.
 * (브랜드가 민트로 바뀌며 danger를 brand에서 분리. 값은 기존 vermilion 레드를 승계.)
 */
export const red = {
  50: '#FFF0ED',
  400: '#FF6B50', // 다크 모드 danger(밝은 레드)
  500: '#E8432D', // 라이트 danger
  600: '#C23320',
} as const;

export const primitives = {
  vermilion,
  red,
  yellow,
  gray,
  // 단색 기능색(스케일 불필요) — 500=메인, 50=옅은 배경
  green: { 50: '#E6F9EE', 500: '#2AC171' }, // success
  blue: { 50: '#EBF2FF', 500: '#3D7FE8' }, // info
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
  'bg-primary': gray[0], // 메인 면(흰색 카드)
  'bg-secondary': gray[50], // 앱 기본 배경(Warm White)
  'bg-tertiary': gray[100], // 미묘한 구분 면
  // 텍스트 — Ink/그레이만. 메인색(vermilion)을 글자색으로 쓰지 않는다.
  'text-primary': gray[900], // Ink
  'text-secondary': gray[600],
  'text-tertiary': gray[500],
  // 보더
  'border-tertiary': gray[100],
  'border-secondary': gray[200],
  // 브랜드 (Vermilion) — 주액션/활성/선택에만
  brand: vermilion[500], // Primary CTA
  'brand-active': vermilion[600], // 눌림
  'brand-strong': vermilion[700], // 그라데이션 끝/진한 강조
  'brand-subtle': vermilion[50], // 옅은 vermilion 틴트
  'brand-subtle-active': vermilion[100],
  'on-brand': gray[0], // 브랜드(민트) 면 위 텍스트(흰색)
  // 앱 상단 헤더 — 포레스트 민트(브랜드와 통일)
  header: vermilion[500], // #1F9660
  'on-header': gray[0], // 헤더 위 텍스트/아이콘(흰색)
  // 보조 강조 (밝은 민트) — primary(민트)와 같은 계열의 두 번째 포인트
  coral: vermilion[400],
  'coral-subtle': vermilion[100], // 옅은 민트 틴트(브랜드 흡수)
  // 기능색
  amber: yellow[400], // 캐시/리워드/출석 강조
  'amber-subtle': yellow[50],
  'amber-strong': yellow[600], // 옅은 배경 없이 캐시를 글자로 쓸 때
  danger: red[500], // 경고/오답/사용(−) — 브랜드(민트)와 분리된 전용 레드
  'danger-subtle': red[50],
  info: primitives.blue[500],
  'info-subtle': primitives.blue[50],

  /* ── 백워드 호환 별칭 (기존 화면/컴포넌트 className·colors.* 키) ── */
  bg: gray[0],
  surface: gray[50],
  border: gray[200],
  'text-strong': gray[900],
  text: gray[600],
  'text-weak': gray[500],
  'brand-dark': vermilion[700],
  'brand-soft': vermilion[50],
  success: primitives.green[500], // 성공/적립(+) = 그린
  'success-subtle': primitives.green[50],
  warning: yellow[400],
  'warning-subtle': yellow[50],
  gold: yellow[400], // 코인/캐시 표현
  'gold-subtle': yellow[50],
} as const satisfies SemanticSet;

const darkSemantic = {
  // 배경 — 따뜻한 다크
  'bg-primary': '#241F1E',
  'bg-secondary': '#1A1716',
  'bg-tertiary': '#332B29',
  // 텍스트
  'text-primary': gray[100],
  'text-secondary': gray[400],
  'text-tertiary': gray[500],
  // 보더
  'border-tertiary': '#332B29',
  'border-secondary': '#4A4442',
  // 브랜드 — 다크에선 밝은 Coral 계열
  brand: vermilion[400],
  'brand-active': vermilion[300],
  'brand-strong': vermilion[500],
  'brand-subtle': '#3A1A14',
  'brand-subtle-active': '#4D241C',
  'on-brand': gray[0], // 브랜드 면 위는 흰 텍스트
  // 앱 상단 헤더 — 포레스트 민트(다크에서도 동일 유지)
  header: vermilion[500],
  'on-header': gray[0],
  // 보조 강조 (밝은 민트)
  coral: vermilion[300],
  'coral-subtle': '#123A28', // 다크 민트 틴트
  // 기능색
  amber: yellow[400],
  'amber-subtle': '#3A330F',
  'amber-strong': yellow[200],
  danger: red[400], // 다크 모드용 밝은 레드(브랜드와 분리)
  'danger-subtle': '#3A1A14',
  info: '#6AA6E8',
  'info-subtle': '#16243A',

  /* ── 백워드 호환 별칭 ── */
  bg: '#1A1716',
  surface: '#241F1E',
  border: '#4A4442',
  'text-strong': gray[100],
  text: gray[400],
  'text-weak': gray[500],
  'brand-dark': vermilion[300],
  'brand-soft': '#3A1A14',
  success: '#3FD487',
  'success-subtle': '#143524',
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
  xs: 6,
  sm: 10, // 인풋/태그/작은 칩
  md: 14, // 버튼 기본
  lg: 18, // 카드 기본
  xl: 24, // 큰 카드/바텀시트
  '2xl': 28,
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
 * 그림자 — 부드럽고 크게 퍼지는, 프리미엄 톤. xs/sm/md/lg 4단계.
 *
 * 원칙: "진하게 좁은" 그림자(개발자 기본값)가 아니라 "옅게 넓게 퍼지는" 그림자.
 *  - opacity는 낮게(0.05~0.14), radius는 크게(6~36) → 공기처럼 떠 보임.
 *  - color는 순검정 대신 약간 푸른 잉크(#0B1220)로 살짝 차갑고 깨끗하게.
 *  - elevation(Android)은 과하지 않게 유지(2~10) — 카드가 무거워 보이지 않도록.
 * 면 구분은 그림자 + 0.5px 보더를 함께 써서 라이트/다크 양쪽에서 또렷하게.
 */
const SHADOW_INK = '#0B1220';
export const shadow = {
  xs: { color: SHADOW_INK, opacity: 0.05, radius: 6, offsetY: 1, elevation: 1 },
  sm: { color: SHADOW_INK, opacity: 0.07, radius: 14, offsetY: 3, elevation: 2 },
  md: { color: SHADOW_INK, opacity: 0.1, radius: 24, offsetY: 8, elevation: 5 },
  lg: { color: SHADOW_INK, opacity: 0.14, radius: 36, offsetY: 14, elevation: 10 },
} as const;

/**
 * 그라데이션 페어 — hero(캐시 잔액 카드 등)용. react-native-svg LinearGradient로 렌더.
 * 단색보다 깊이감이 살아 프리미엄하게 보인다. 민트 brand 계열로 절제해서 사용.
 */
export const gradients = {
  brand: [vermilion[300], vermilion[600]] as [string, string], // 밝은 민트 → 진한 민트 (캐시 hero)
  brandSoft: [vermilion[50], vermilion[100]] as [string, string],
} as const;

/** 모달/바텀시트 스크림(반투명 검정). 라이트/다크 공통. */
export const scrim = 'rgba(15, 18, 22, 0.55)';

/**
 * 타이포 — 폰트: Pretendard (Regular 400 / Medium 500 / SemiBold 600 / Bold 700).
 * 배민 한나체는 브랜드 전용이라 미적용.
 *
 * ⚠️ Android는 weight가 아니라 fontFamily(PostScript 이름)로 굵기를 고른다.
 *    그래서 굵기마다 별도 패밀리를 둔다. 4종 .otf가 android assets/fonts에 링크돼 있음.
 *    위계의 핵심 무기는 SemiBold(헤딩)와 Bold(타이틀·숫자)의 대비다.
 */
export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** 사이즈 스케일. lineHeight 는 절대값(px). */
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15, // body 기본
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  '5xl': 42, // hero(캐시 잔액 등 큰 숫자)
} as const;

export const lineHeight = {
  xs: 17,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 34,
  '4xl': 41,
  '5xl': 46,
} as const;

/**
 * 의미 단위 타이포 변형(AppText variant).
 *
 * 위계 전략 — 크기뿐 아니라 "굵기"로 층을 나눈다:
 *  · hero/display/title → Bold (시선이 가장 먼저 닿는 곳, 숫자·타이틀)
 *  · heading/subheading/label → SemiBold (구조를 잡되 과하지 않게)
 *  · body/caption → Regular (읽는 텍스트는 가볍게)
 *  · micro → Medium (작아도 또렷하게)
 * 자간(letterSpacing)은 큰 글자일수록 음수로 조여 또렷하고 단단하게.
 */
export const typography = {
  hero: { fontSize: 34, lineHeight: 40, fontFamily: fontFamily.bold, letterSpacing: -0.8 },
  display: { fontSize: 26, lineHeight: 32, fontFamily: fontFamily.bold, letterSpacing: -0.6 },
  title: { fontSize: 19, lineHeight: 26, fontFamily: fontFamily.bold, letterSpacing: -0.4 },
  heading: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.semibold, letterSpacing: -0.3 },
  subheading: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.semibold, letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.regular, letterSpacing: -0.1 },
  label: { fontSize: 13, lineHeight: 17, fontFamily: fontFamily.semibold, letterSpacing: -0.1 },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.regular, letterSpacing: 0 },
  micro: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.medium, letterSpacing: 0 },
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
  vermilion,
  red,
  yellow,
  gray,
  semantic,
  colors,
  radius,
  spacing,
  shadow,
  gradients,
  scrim,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  typography,
  hairline,
} as const;

export type Tokens = typeof tokens;
export default tokens;
