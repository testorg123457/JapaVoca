/**
 * 잠금화면 학습 전용 RN 루트 (AppRegistry "JapaVocaLock").
 *
 * 네이티브 LockQuizActivity 가 이 컴포넌트를 호스팅한다. 메인 App 과 달리
 * 온보딩/네비게이션 게이트 없이 곧장 잠금화면 퀴즈만 띄운다(로그인 토큰은
 * MMKV 공유 → AuthProvider 가 동일하게 읽음).
 *
 * 동작 콜백은 네이티브 모듈(LockScreen)로 연결:
 *  - 잠금해제(스와이프) → unlock(): 액티비티 종료
 *  - 앱 열기 / 상자 → openApp(): keyguard 해제 + 메인 앱 실행
 */
import '../global.css';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './api/queryClient';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { LockQuizView } from './screens/quiz/LockQuizScreen';
import { openAppFromLock, unlockLockQuiz } from './lib/lockScreen';

export default function LockApp(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <LockQuizView
                onUnlock={unlockLockQuiz}
                onOpenApp={openAppFromLock}
                onOpenBoxes={openAppFromLock}
              />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
