/**
 * ListRow — 설정/리스트형 화면의 한 행. (알라미식 "박스보다 줄")
 *
 * 둥근 카드에 가두지 않고 풀폭 면 + 하단 헤어라인으로 행을 나눈다. 좌측은 제목(+선택
 * 부제), 우측은 값 또는 진입 어포던스 `>`. 누르면 다른 화면으로 가는 행엔 chevron,
 * 값 표시형엔 값만. 터치 타깃은 최소 56px.
 *
 * 보통 ListSection 안에 여러 개를 넣어 쓴다. 부모(ListSection)가 px 패딩과 면 배경을
 * 책임지므로 여기서는 행 자체만 그린다. 마지막 행이 아니면 하단 구분선을 그린다.
 */
import React from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';
import Icon, { type IconName } from './Icon';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** 우측 값 표시(예: 현재 급수/버전). chevron 대신 값만 보여줄 때. */
  value?: string;
  /** 설정은 텍스트 위주 — 아이콘은 생략 권장. */
  leftIcon?: IconName;
  onPress?: () => void;
  /** 기본: onPress가 있으면 true. value만 보여줄 땐 false로. */
  showChevron?: boolean;
  danger?: boolean;
  /** 마지막 행이면 하단 구분선 생략. */
  last?: boolean;
}

export function ListRow({
  title,
  subtitle,
  value,
  leftIcon,
  onPress,
  showChevron,
  danger = false,
  last = false,
}: ListRowProps): React.JSX.Element {
  const c = useThemeColors();
  const chevron = showChevron ?? !!onPress;
  const titleColor = danger ? 'text-danger' : 'text-text-primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center justify-between px-xl py-md ${
        onPress ? 'active:opacity-60' : ''
      } ${last ? '' : 'border-b border-border-tertiary'}`}
      style={{ minHeight: 56 }}>
      <View className="flex-1 flex-row items-center" style={{ gap: 12 }}>
        {leftIcon ? (
          <Icon name={leftIcon} size={20} color={danger ? c.danger : c['text-secondary']} />
        ) : null}
        <View className="flex-1">
          <AppText variant="subheading" className={titleColor}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" className="mt-xs text-text-tertiary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        {value ? (
          <AppText variant="body" className="text-text-tertiary">
            {value}
          </AppText>
        ) : null}
        {chevron ? (
          <Icon name="chevron-right" size={18} color={c['text-tertiary']} strokeWidth={2.2} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default ListRow;
