/**
 * 온보딩 스택 — 약관 동의(Terms/TermsDetail) → 권한 허용(Permissions).
 * initialStep 으로 진입 지점을 정한다(재실행 시 동의 완료면 Permissions부터).
 * onComplete 는 권한까지 끝났을 때 RootNavigator의 게이트 재계산(recheck)을 부른다.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from './types';
import TermsScreen from '../screens/onboarding/TermsScreen';
import TermsDetailScreen from '../screens/onboarding/TermsDetailScreen';
import PermissionsScreen from '../screens/onboarding/PermissionsScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type OnboardingActions = { onComplete: () => void };
const OnboardingActionsContext = createContext<OnboardingActions>({ onComplete: () => {} });
export const useOnboardingActions = (): OnboardingActions => useContext(OnboardingActionsContext);

type Props = { initialStep: 'terms' | 'permissions'; onComplete: () => void };

export default function OnboardingStack({ initialStep, onComplete }: Props): React.JSX.Element {
  const actions = useMemo(() => ({ onComplete }), [onComplete]);
  return (
    <OnboardingActionsContext.Provider value={actions}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialStep === 'permissions' ? 'Permissions' : 'Terms'}>
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="TermsDetail" component={TermsDetailScreen} />
        <Stack.Screen name="Permissions" component={PermissionsScreen} />
      </Stack.Navigator>
    </OnboardingActionsContext.Provider>
  );
}
