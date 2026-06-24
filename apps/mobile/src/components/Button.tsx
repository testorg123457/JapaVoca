/**
 * Button — NativeWind 기반 공용 버튼 (배달의민족 배시시 스타일).
 *
 * variant:
 *  - filled  : brand-400(#2AC1BC) 채움 + 흰 텍스트, 눌림 brand-500 (= primary)
 *  - soft    : brand-subtle(연민트) 면 + brand 텍스트 (tonal)
 *  - outline : 흰 면 + brand-400 보더 + brand-400 텍스트 (= secondary)
 * 높이 52(배민식 넉넉한 터치 타겟), radius md(12), 텍스트 Bold.
 */
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { fontFamily } from '../theme/tokens';
import AppText from './AppText';

type Variant = 'filled' | 'soft' | 'outline';

const boxByVariant: Record<Variant, string> = {
  filled: 'bg-brand active:bg-brand-active',
  soft: 'bg-brand-subtle active:bg-brand-subtle-active',
  outline: 'bg-bg-primary border border-brand active:bg-brand-subtle',
};

const textByVariant: Record<Variant, string> = {
  filled: 'text-on-brand',
  soft: 'text-brand',
  outline: 'text-brand',
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
      className={`h-[52px] rounded-md px-xl items-center justify-center ${
        boxByVariant[variant]
      } ${disabled ? 'opacity-40' : ''} ${className}`}
      {...rest}>
      <AppText
        variant="body"
        className={textByVariant[variant]}
        style={{ fontFamily: fontFamily.bold, fontSize: 16 }}>
        {title}
      </AppText>
    </Pressable>
  );
}

export default Button;
