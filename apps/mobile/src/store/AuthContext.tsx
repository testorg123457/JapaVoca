/**
 * 로그인 상태 전역 관리 — React Context (외부 상태 라이브러리 없이).
 *
 * store/auth.ts(MMKV)를 단일 진실원으로 삼아, 앱 시작 시 토큰 유무로 초기
 * 상태를 정하고 signIn/signOut 시 토큰 저장소와 상태를 함께 갱신한다.
 * RootNavigator가 이 상태로 AuthStack ↔ MainStack 을 즉시 전환한다.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  clearTokens,
  isLoggedIn as readIsLoggedIn,
  setTokens,
} from './auth';
import { clearOnboardingCache } from './onboarding';
import { queryClient } from '../api/queryClient';

// 계정 전환 시 이전 계정의 동의 상태가 새 계정으로 새지 않도록 동의 캐시를 모두 비운다.
// MMKV 캐시 + React Query in-memory 캐시 둘 다 지워야 한다(invalidate는 refetch 동안
// 옛 data를 유지해 게이트가 잠깐 Terms를 건너뛸 수 있으므로 removeQueries 사용).
// 키는 api/consent의 CONSENT_QUERY_KEY와 동일하지만, import 순환(consent→client→AuthContext)을
// 피하려고 리터럴로 둔다.
function clearConsentState(): void {
  clearOnboardingCache();
  queryClient.removeQueries({ queryKey: ['consent', 'status'] });
}

type AuthContextValue = {
  isLoggedIn: boolean;
  /** 토큰을 저장하고 로그인 상태로 전환한다. */
  signIn: (access: string, refresh: string) => void;
  /** 토큰을 지우고 비로그인 상태로 전환한다. */
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// api/client.ts(React 트리 밖, axios 인터셉터)가 refresh 실패 시 로그아웃을
// 트리거할 수 있도록 마운트된 AuthProvider의 signOut을 등록해두는 다리.
let signOutBridge: (() => void) | null = null;

/** axios 인터셉터 등 React 트리 밖에서 강제 로그아웃을 트리거한다. */
export function forceSignOut(): void {
  signOutBridge?.();
}

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  // 앱 시작 시점의 토큰 유무로 초기화 (동기적으로 읽음).
  const [loggedIn, setLoggedIn] = useState<boolean>(() => readIsLoggedIn());

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn: loggedIn,
      signIn: (access: string, refresh: string) => {
        // 게스트→소셜 연결(SettingsScreen)처럼 signOut 없이 다른 계정으로 전환되는 경로가
        // 있어, 로그인 시점에 이전 계정의 동의 캐시를 동기적으로 비운다(계정 누수 방지).
        clearConsentState();
        setTokens(access, refresh);
        setLoggedIn(true);
      },
      signOut: () => {
        clearTokens();
        clearConsentState();
        setLoggedIn(false);
      },
    }),
    [loggedIn],
  );

  useEffect(() => {
    signOutBridge = value.signOut;
    return () => {
      signOutBridge = null;
    };
  }, [value.signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
