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
  /** 단일 스크롤 메인. 구 BottomTab 대체. */
  Home: undefined;
  Quiz: undefined;
  BoxOpen: { boxIds: number[] };
  /** 히라가나/가타카나 학습. */
  Kana: undefined;
  /** 출석체크(달력/스트릭). */
  Attendance: undefined;
  /** 설정(헤더 우측 버튼으로 진입). */
  Settings: undefined;
  /** 기프티콘 교환. */
  Exchange: undefined;
  /** 캐시 적립/사용 내역(설정 > 내역). */
  Ledger: undefined;
  /** DEBUG 전용 — 디자인 시스템 쇼케이스. */
  StyleGuide: undefined;
};

/**
 * @deprecated 하단 탭 제거됨(홈 단일 스크롤로 통합). 타입은 deprecated된
 * WalletScreen/SettingsScreen의 컴파일 호환을 위해서만 남겨둔다.
 */
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

/** @deprecated 하단 탭 제거됨. deprecated 화면 컴파일 호환용. */
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
