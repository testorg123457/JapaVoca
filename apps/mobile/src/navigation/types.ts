/**
 * 내비게이션 타입 정의 — 화면 파라미터 목록(ParamList)의 단일 소스.
 *
 * 화면 컴포넌트는 여기서 파생한 ScreenProps 타입으로 route/navigation 을
 * 타입 안전하게 받는다.
 */
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  BottomTab: NavigatorScreenParams<BottomTabParamList>;
  Quiz: undefined;
  BoxOpen: { boxIds: number[] };
  /** DEBUG 전용 — 디자인 시스템 쇼케이스(설정에서 진입). */
  StyleGuide: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Wallet: undefined;
  Settings: undefined;
};

/** 화면별 props 헬퍼 타입. */
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;

export type BottomTabScreenPropsFor<T extends keyof BottomTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<BottomTabParamList, T>,
    NativeStackScreenProps<MainStackParamList>
  >;

/**
 * 전역 navigation 타입 보강 — useNavigation 등을 파라미터 없이 써도
 * RootStackParamList 기준으로 타입이 잡힌다.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
