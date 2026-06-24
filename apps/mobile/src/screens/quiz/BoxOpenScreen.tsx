/**
 * 상자 개봉 화면 (골격). 보상형 광고 + 캐시 지급은 다음 단계.
 *
 * route.params.boxIds 로 개봉 대상 상자를 받는다(타입만 연결, 사용은 다음 단계).
 */
import React from 'react';
import { Text, View } from 'react-native';

import type { MainStackScreenProps } from '../../navigation/types';

export default function BoxOpenScreen({
  route,
}: MainStackScreenProps<'BoxOpen'>): React.JSX.Element {
  const { boxIds } = route.params;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>상자 개봉 화면 (boxIds: {boxIds.length}개)</Text>
    </View>
  );
}
