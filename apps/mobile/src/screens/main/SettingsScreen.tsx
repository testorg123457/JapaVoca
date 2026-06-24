/**
 * 설정 화면 (골격). 실제 설정 항목은 다음 단계.
 *
 * 로그아웃은 골격 검증(MainStack → AuthStack 리셋)을 위해 동작하게 둔다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '../../store/AuthContext';
import { colors } from '../../theme/tokens';

export default function SettingsScreen(): React.JSX.Element {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <Text>설정 화면</Text>
      <Pressable
        onPress={signOut}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          backgroundColor: colors.danger,
        }}>
        <Text style={{ color: '#FFFFFF' }}>로그아웃</Text>
      </Pressable>
    </View>
  );
}
