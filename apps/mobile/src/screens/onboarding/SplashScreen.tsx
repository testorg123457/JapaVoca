/** 게이트 상태 확정 전 잠깐 보이는 스플래시(깜빡임 방지). */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Gradient, Icon } from '../../components';
import { gradients } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';

export default function SplashScreen(): React.JSX.Element {
  const c = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center bg-bg-secondary gap-2xl">
      <View className="overflow-hidden rounded-2xl" style={{ width: 84, height: 84 }}>
        <Gradient colors={gradients.brand} direction="diagonal" />
        <View className="flex-1 items-center justify-center">
          <Icon name="book" size={44} color="#FFFFFF" strokeWidth={2.2} />
        </View>
      </View>
      <ActivityIndicator color={c.brand} />
    </View>
  );
}
