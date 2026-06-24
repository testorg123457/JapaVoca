/**
 * 홈 화면 (골격). 실제 UI는 다음 단계.
 *
 * 퀴즈/상자 개봉으로의 진입점도 다음 단계에서 붙인다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../../theme/tokens';
import type { BottomTabScreenPropsFor } from '../../navigation/types';

export default function HomeScreen(): React.JSX.Element {
  const navigation =
    useNavigation<BottomTabScreenPropsFor<'Home'>['navigation']>();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <Text>홈 화면</Text>
      <Pressable
        onPress={() => navigation.navigate('Quiz')}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          backgroundColor: colors.brand,
        }}>
        <Text style={{ color: '#FFFFFF' }}>퀴즈 풀기 (골격 진입)</Text>
      </Pressable>
    </View>
  );
}
