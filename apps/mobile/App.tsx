/**
 * JapaVoca 앱 진입점.
 *
 * Provider 구성(바깥→안):
 *   GestureHandlerRootView → SafeAreaProvider → 화면
 *
 * 디자인 시스템은 디자인 토큰(src/theme/tokens.ts 단일 소스) + NativeWind 기반으로 동작합니다.
 * 공용 UI(Button/Card/CashBadge/AppText)는 src/components/에 NativeWind로 직접 구현합니다.
 *
 * @format
 */
import './global.css';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import StyleGuideScreen from './src/screens/StyleGuideScreen';

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StyleGuideScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
