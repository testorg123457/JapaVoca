import type { Config } from 'tailwindcss';
import nativewind from 'nativewind/preset';

import { brand, cssVarColors, gray, radius, spacing, yellow } from './src/theme/tokens';

/**
 * NativeWind(Tailwind) 설정 — 배달의민족(배시시) 토큰.
 *
 * 색은 두 갈래로 제공한다:
 *  1) semantic 토큰명 → `var(--color-<token>)` css 변수(cssVarColors). 다크 모드 대응.
 *     실제 값은 ThemeProvider가 useColorScheme 기준으로 주입 → bg-brand / text-text-secondary 등.
 *  2) raw 팔레트 brand / yellow / gray (모드 무관 고정값) → bg-brand-400 / text-yellow-400 / bg-gray-50 등.
 *
 * ⚠️ brand 는 두 용도가 겹친다: `bg-brand`(semantic, 모드 대응)는 DEFAULT(css var)로,
 *    `bg-brand-400`(raw)은 스케일로 동시에 동작하도록 DEFAULT + 스케일을 합쳐 등록한다.
 * 라운드/간격은 tokens.ts의 고정 값을 그대로 매핑.
 */
const px = <T extends Record<string, number>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `${v}px`])) as Record<keyof T, string>;

const config: Config = {
  content: ['./App.tsx', './index.js', './src/**/*.{ts,tsx,js,jsx}'],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        ...cssVarColors,
        // raw 팔레트. brand 는 semantic `bg-brand` 보존을 위해 DEFAULT(css var) 포함.
        brand: { DEFAULT: 'var(--color-brand)', ...brand },
        yellow,
        gray,
      },
      borderRadius: px(radius),
      spacing: px(spacing),
      // NOTE: 폰트(패밀리/사이즈/자간/줄높이)는 className 대신 tokens.ts의 typography
      // 스타일 객체를 style로 적용한다(AppText 컴포넌트 참고).
    },
  },
  plugins: [],
};

export default config;
