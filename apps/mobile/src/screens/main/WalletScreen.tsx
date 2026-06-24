/**
 * 지갑 화면 (골격). 실제 잔액/내역 UI는 다음 단계.
 */
import React from 'react';
import { Text, View } from 'react-native';

export default function WalletScreen(): React.JSX.Element {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>지갑 화면</Text>
    </View>
  );
}
