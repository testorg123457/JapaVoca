/**
 * SectionHeader — 화면 섹션 제목(+ 선택적 우측 액션).
 *
 * "오늘의 학습 현황", "상자 인벤토리" 같은 섹션 제목을 일관된 위계/간격으로. 제목은
 * heading(SemiBold), 우측 액션은 caption + chevron. 섹션마다 제각각이던 간격을 통일.
 */
import React from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon from './Icon';

export interface SectionHeaderProps {
  title: string;
  /** 우측 보조 텍스트(예: "전체보기"). onPress와 함께 chevron 표시. */
  actionLabel?: string;
  onPressAction?: () => void;
  className?: string;
}

export function SectionHeader({ title, actionLabel, onPressAction, className = '' }: SectionHeaderProps) {
  const c = useThemeColors();
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <AppText variant="heading" className="text-text-primary">
        {title}
      </AppText>
      {actionLabel ? (
        <Pressable
          className="flex-row items-center active:opacity-60"
          style={{ gap: 2 }}
          onPress={onPressAction}
          hitSlop={8}>
          <AppText variant="caption" className="text-text-tertiary">
            {actionLabel}
          </AppText>
          <Icon name="chevron-right" size={14} color={c['text-tertiary']} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default SectionHeader;
