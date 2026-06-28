/**
 * JapaVoca 앱 진입점.
 *
 * Provider 구성(바깥→안):
 *   GestureHandlerRootView → SafeAreaProvider → ThemeProvider
 *   → QueryClientProvider → AuthProvider → NavigationContainer → RootNavigator
 *
 * 디자인 시스템은 디자인 토큰(src/theme/tokens.ts 단일 소스) + NativeWind 기반.
 * 공용 UI(Button/Card/CashBadge/AppText)는 src/components/에 NativeWind로 구현.
 *
 * @format
 */
import './global.css';

import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import mobileAds from 'react-native-google-mobile-ads';
import BootSplash from 'react-native-bootsplash';

import { queryClient } from './src/api/queryClient';
import { AuthProvider } from './src/store/AuthContext';
import { ThemeProvider } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { startStudyNotification } from './src/lib/studyNotification';

function App(): React.JSX.Element {
  useEffect(() => {
    mobileAds()
      .initialize()
      .catch((error) => console.warn('AdMob 초기화 실패:', error));

    BootSplash.hide({ fade: true });

    startStudyNotification();

    // 앱 포그라운드 진입 시 알림 재게시 (사용자가 지웠을 때 복원)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { startStudyNotification(); }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
