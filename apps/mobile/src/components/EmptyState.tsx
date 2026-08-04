/**
 * EmptyState — 목록이 비었을 때 자리를 채우는 안내.
 *
 * "없음"만 알리고 끝내지 않고 **다음 행동**을 준다(빈 화면은 행동 초대장).
 * 아이콘은 원형 칩에 가두지 않고 맨몸으로 둔다 — 칩을 두르면 없는 데이터에
 * 도리어 무게가 실린다. 위계는 여백과 굵기로만.
 */
import React from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Button from './Button';
import Icon, { type IconName } from './Icon';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  /** 왜 비었는지 / 어떻게 채우는지 한 줄. */
  description?: string;
  /** 있으면 아래에 보조 버튼. 동사로 — 누르면 무슨 일이 생기는지. */
  actionLabel?: string;
  onPressAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onPressAction,
}: EmptyStateProps): React.JSX.Element {
  const c = useThemeColors();
  return (
    <View className="items-center px-2xl" style={{ paddingTop: 72 }}>
      <Icon name={icon} size={30} color={c['text-tertiary']} strokeWidth={1.6} />
      <AppText variant="heading" className="text-text-primary" style={{ marginTop: 14 }}>
        {title}
      </AppText>
      {description ? (
        <AppText
          variant="body"
          className="text-center text-text-tertiary"
          style={{ marginTop: 6 }}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onPressAction ? (
        <Button
          title={actionLabel}
          variant="soft"
          size="sm"
          onPress={onPressAction}
          className="mt-2xl"
        />
      ) : null}
    </View>
  );
}

export default EmptyState;
