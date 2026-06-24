/**
 * 퀴즈 화면 (골격). 4지선다/SRS는 다음 단계.
 *
 * 탭바 위에 전체화면으로 올라온다(MainStack의 BottomTab과 형제 스크린).
 * 골격 검증을 위해 상자 개봉 화면으로의 이동만 붙여둔다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';
import type { MainStackScreenProps } from '../../navigation/types';

export default function QuizScreen({
  navigation,
}: MainStackScreenProps<'Quiz'>): React.JSX.Element {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <Text>퀴즈 화면</Text>
      <Pressable
        onPress={() => navigation.navigate('BoxOpen', { boxIds: [] })}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          backgroundColor: colors.brand,
        }}>
        <Text style={{ color: '#FFFFFF' }}>상자 개봉 (골격 진입)</Text>
      </Pressable>
    </View>
  );
}
