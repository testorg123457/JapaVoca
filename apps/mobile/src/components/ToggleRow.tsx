/**
 * ToggleRow — 우측에 스위치가 있는 설정 행. (ListRow와 동일 톤/높이)
 *
 * ListSection 안에 ListRow와 섞어 쓴다. 좌측 제목 + 우측 Switch.
 */
import React from 'react';
import { Switch, View } from 'react-native';

import { useThemeColors } from '../theme/ThemeProvider';
import AppText from './AppText';

export interface ToggleRowProps {
  title: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}

export function ToggleRow({ title, value, onValueChange, last }: ToggleRowProps): React.JSX.Element {
  const c = useThemeColors();
  return (
    <View
      className={`flex-row items-center justify-between px-xl py-md ${last ? '' : 'border-b border-border-tertiary'}`}
      style={{ minHeight: 56 }}>
      <AppText variant="heading" className="text-text-primary">
        {title}
      </AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c['border-secondary'], true: c.brand }}
        thumbColor={c['bg-primary']}
      />
    </View>
  );
}

export default ToggleRow;
