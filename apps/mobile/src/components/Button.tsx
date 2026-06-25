/**
 * Button — 공용 버튼 (배달의민족 배시시 톤 + "누를 맛").
 *
 * 개선점(왜):
 *  - press 시 scale 0.97로 꾹 눌리는 촉감(PressableScale). 색만 바뀌던 기존 대비 체감↑.
 *  - filled는 미세한 그림자로 면에서 살짝 떠 보이게 → 주 액션이 명확.
 *  - loading 상태(스피너) / leftIcon 슬롯 / 사이즈(sm·md·lg) 지원.
 *  - disabled는 opacity 뭉개기 대신 중립색(gray)으로 "비활성"임을 또렷이.
 *
 * variant: filled(주 액션) · soft(보조, 연민트) · outline(테두리) · ghost(텍스트만)
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { fontFamily } from '../theme/tokens';
import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon, { type IconName } from './Icon';
import PressableScale, { type PressableScaleProps } from './PressableScale';

type Variant = 'filled' | 'soft' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { height: number; fontSize: number; radius: string; px: string; icon: number }> = {
  sm: { height: 44, fontSize: 15, radius: 'rounded-md', px: 'px-lg', icon: 18 },
  md: { height: 52, fontSize: 16, radius: 'rounded-md', px: 'px-xl', icon: 20 },
  lg: { height: 56, fontSize: 17, radius: 'rounded-lg', px: 'px-xl', icon: 22 },
};

const BOX: Record<Variant, string> = {
  filled: 'bg-brand active:bg-brand-active', // 눌림 = vermilion-600
  soft: 'bg-brand-subtle',
  outline: 'bg-bg-primary border border-brand',
  ghost: 'bg-transparent',
};

const TEXT: Record<Variant, string> = {
  filled: 'text-on-brand',
  soft: 'text-brand',
  outline: 'text-brand',
  ghost: 'text-brand',
};

export interface ButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: IconName;
  className?: string;
}

export function Button({
  title,
  variant = 'filled',
  size = 'md',
  loading = false,
  leftIcon,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const c = useThemeColors();
  const sz = SIZE[size];
  const isDisabled = disabled || loading;

  // 색: filled는 흰 텍스트/아이콘, 그 외는 브랜드색.
  const contentColor = variant === 'filled' ? c['on-brand'] : c.brand;
  // disabled 면/텍스트 — 중립색으로 또렷하게.
  const disabledBox = variant === 'filled' ? 'bg-gray-300' : 'bg-transparent border border-border-secondary';
  const disabledText = c['text-tertiary'];

  return (
    <PressableScale
      disabled={isDisabled}
      pressedScale={0.97}
      // 높이는 동적이라 style로(NativeWind는 정적 className만 스캔). filled만 살짝 떠 보이는
      // 그림자로 주 액션 강조 — 비활성/기타 variant는 평평하게.
      style={[
        { height: sz.height },
        variant === 'filled' && !isDisabled
          ? { shadowColor: c.brand, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }
          : null,
      ]}
      className={`${sz.radius} ${sz.px} flex-row items-center justify-center ${
        isDisabled ? disabledBox : BOX[variant]
      } ${className}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={isDisabled ? disabledText : contentColor} />
      ) : (
        <View className="flex-row items-center" style={{ gap: 7 }}>
          {leftIcon ? (
            <Icon name={leftIcon} size={sz.icon} color={isDisabled ? disabledText : contentColor} />
          ) : null}
          <AppText
            variant="label"
            className={isDisabled ? '' : TEXT[variant]}
            style={{ fontFamily: fontFamily.bold, fontSize: sz.fontSize, color: isDisabled ? disabledText : undefined }}>
            {title}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

export default Button;
