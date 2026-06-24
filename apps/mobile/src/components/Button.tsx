/**
 * Button — NativeWind 기반 공용 버튼 (Arco풍).
 *
 * variant:
 *  - filled  : 브랜드 블루 채움 + on-brand(흰) 텍스트 (= primary)
 *  - soft    : brand-subtle 면 + brand 텍스트
 *  - outline : 면(bg-primary) + 0.5px 보더(border-secondary) + 기본 텍스트 (= secondary)
 * 눌렀을 때 살짝 축소(active:scale-[0.98]). 라운드는 lg(12).
 */
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { hairline, typography } from '../theme/tokens';
import AppText from './AppText';

type Variant = 'filled' | 'soft' | 'outline';

const boxByVariant: Record<Variant, string> = {
  filled: 'bg-brand',
  soft: 'bg-brand-subtle',
  outline: 'bg-bg-primary border-border-secondary',
};

const textByVariant: Record<Variant, string> = {
  filled: 'text-on-brand',
  soft: 'text-brand',
  outline: 'text-text-primary',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  className?: string;
}

export function Button({
  title,
  variant = 'filled',
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      className={`rounded-lg px-xl py-lg items-center justify-center active:scale-[0.98] ${
        boxByVariant[variant]
      } ${disabled ? 'opacity-40' : ''} ${className}`}
      style={variant === 'outline' ? { borderWidth: hairline } : undefined}
      {...rest}>
      <AppText
        variant="body"
        className={textByVariant[variant]}
        style={{ fontFamily: typography.title.fontFamily }}>
        {title}
      </AppText>
    </Pressable>
  );
}

export default Button;
