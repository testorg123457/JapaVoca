import type { Config } from 'tailwindcss';
import nativewind from 'nativewind/preset';

import { colors, radius, spacing } from './src/theme/tokens';

/**
 * NativeWind(Tailwind) 설정.
 * 색/라운드/간격/폰트는 src/theme/tokens.ts(단일 소스)를 그대로 매핑합니다.
 */
const config: Config = {
  content: ['./App.tsx', './index.js', './src/**/*.{ts,tsx,js,jsx}'],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: colors.brand,
          dark: colors.brandDark,
          soft: colors.brandSoft,
        },
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        gold: colors.gold,
        bg: colors.bg,
        surface: colors.surface,
        border: colors.border,
        'text-strong': colors.textStrong,
        text: colors.text,
        'text-weak': colors.textWeak,
      },
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
      // NOTE: 폰트(패밀리/사이즈/자간)는 className(font-bold 등 Tailwind 기본
      // font-weight와 충돌) 대신 tokens.ts의 typography 스타일 객체를 style로
      // 적용합니다. (AppText 컴포넌트 참고)
    },
  },
  plugins: [],
};

export default config;
