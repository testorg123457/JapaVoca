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
        setTokens(access, refresh);
        setLoggedIn(true);
      },
      signOut: () => {
        clearTokens();
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
