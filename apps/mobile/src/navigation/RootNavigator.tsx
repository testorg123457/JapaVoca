/**
 * 루트 내비게이터 — 로그인 + 온보딩 게이트로 분기.
 *
 * !isLoggedIn → Auth. 로그인 후엔 게이트 상태(useOnboardingGate)로:
 *   loading → Splash, terms/permissions → Onboarding, ready → Main.
 * 게이트가 ready가 되면(동의 완료 + 필수권한 허용) Main으로 교체된다.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../store/AuthContext';
import { useOnboardingGate } from './onboardingGate';
import type { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import OnboardingStack from './OnboardingStack';
import SplashScreen from '../screens/onboarding/SplashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator(): React.JSX.Element {
  const { isLoggedIn } = useAuth();
  const { status, recheck } = useOnboardingGate(isLoggedIn);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : status === 'ready' ? (
        <Stack.Screen name="Main" component={MainStack} />
      ) : status === 'loading' ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : (
        <Stack.Screen name="Onboarding">
          {() => <OnboardingStack initialStep={status} onComplete={recheck} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
