/**
 * Button — NativeWind 기반 공용 버튼.
 * 토스st: 큼직하고 둥근(rounded-lg) 버튼. variant 3종.
 */
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { typography } from '../theme/tokens';
import AppText from './AppText';

type Variant = 'filled' | 'soft' | 'outline';

const boxByVariant: Record<Variant, string> = {
  filled: 'bg-brand',
  soft: 'bg-brand-soft',
  outline: 'bg-bg border border-border',
};

const textByVariant: Record<Variant, string> = {
  filled: 'text-white',
  soft: 'text-brand',
  outline: 'text-text-strong',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  className?: string;
}

export function Button({ title, variant = 'filled', className = '', ...rest }: ButtonProps) {
  return (
    <Pressable
      className={`rounded-lg px-xl py-lg items-center justify-center active:opacity-80 ${boxByVariant[variant]} ${className}`}
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
