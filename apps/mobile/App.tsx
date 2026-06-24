/**
 * JapaVoca 앱 진입점.
 *
 * Provider 구성(바깥→안):
 *   GestureHandlerRootView → SafeAreaProvider → AuthProvider
 *   → NavigationContainer → RootNavigator
 *
 * 디자인 시스템은 디자인 토큰(src/theme/tokens.ts 단일 소스) + NativeWind 기반.
 * 공용 UI(Button/Card/CashBadge/AppText)는 src/components/에 NativeWind로 구현.
 *
 * @format
 */
import './global.css';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from './src/store/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
