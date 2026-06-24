/**
 * 루트 내비게이터 — 로그인 상태에 따라 AuthStack ↔ MainStack 분기.
 *
 * 상태는 AuthContext(MMKV 기반)에서 읽는다. signIn/signOut 으로 isLoggedIn 이
 * 바뀌면 조건부 렌더된 스크린이 교체되며 스택이 리셋된다(로그아웃 시 AuthStack).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../store/AuthContext';
import type { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator(): React.JSX.Element {
  const { isLoggedIn } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main" component={MainStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
