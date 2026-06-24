import type { Config } from 'tailwindcss';
import nativewind from 'nativewind/preset';

import { cssVarColors, radius, spacing } from './src/theme/tokens';

/**
 * NativeWind(Tailwind) 설정.
 *
 * 색은 semantic 토큰명 → `var(--color-<token>)` css 변수로 매핑한다(cssVarColors).
 * 실제 변수 값은 ThemeProvider(src/theme/ThemeProvider.tsx)가 useColorScheme 기준으로
 * 주입하므로, 다크 모드는 tokens.ts의 semantic 매핑 한 곳만 바꾸면 className 전체가
 * 따라온다. 라운드/간격은 tokens.ts의 고정 값을 그대로 매핑.
 *
 * className 예: bg-bg-primary / text-text-secondary / border-border-tertiary / bg-brand
 */
const config: Config = {
  content: ['./App.tsx', './index.js', './src/**/*.{ts,tsx,js,jsx}'],
  presets: [nativewind],
  theme: {
    extend: {
      colors: cssVarColors,
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        xl: `${radius.xl}px`,
        pill: `${radius.pill}px`,
      },
      spacing: {
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
        '2xl': `${spacing['2xl']}px`,
        '3xl': `${spacing['3xl']}px`,
      },
      // NOTE: 폰트(패밀리/사이즈/자간/줄높이)는 className 대신 tokens.ts의 typography
      // 스타일 객체를 style로 적용한다(AppText 컴포넌트 참고).
    },
  },
  plugins: [],
};

export default config;
