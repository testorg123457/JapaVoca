/**
 * 로그인 후 스택 — 하단 탭 + 그 위로 올라오는 퀴즈/상자 개봉.
 *
 * BottomTab 과 Quiz/BoxOpen 을 형제 스크린으로 두어, 퀴즈·상자 개봉이
 * 탭바를 덮는 전체화면으로 표시되게 한다(탭바 숨김 처리 불필요).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { MainStackParamList } from './types';
import BottomTabNavigator from './BottomTabNavigator';
import QuizScreen from '../screens/quiz/QuizScreen';
import BoxOpenScreen from '../screens/quiz/BoxOpenScreen';
import StyleGuideScreen from '../screens/StyleGuideScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BottomTab" component={BottomTabNavigator} />
      <Stack.Screen
        name="Quiz"
        component={QuizScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="BoxOpen"
        component={BoxOpenScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      {__DEV__ && (
        <Stack.Screen
          name="StyleGuide"
          component={StyleGuideScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
      )}
    </Stack.Navigator>
  );
}
