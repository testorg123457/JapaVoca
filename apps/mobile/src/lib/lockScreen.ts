/**
 * 잠금화면 학습 네이티브 모듈(LockScreen) 래퍼.
 * 모듈이 없거나(빌드 전/iOS) Android가 아니면 no-op.
 *
 * 네이티브(android LockScreenModule):
 *  - enable()/disable(): 포그라운드 서비스 시작/중지 + 켜짐 상태 영속(SharedPreferences)
 *  - isEnabled(): 현재 켜짐 여부
 *  - showNow(): 잠금화면 퀴즈 액티비티를 즉시 띄움(테스트용)
 *  - unlock(): 잠금화면 퀴즈 액티비티 종료(스와이프 해제)
 *  - openApp(): keyguard 해제 요청 + 메인 앱 실행, 잠금 액티비티 종료
 */
import { NativeModules, Platform } from 'react-native';

type LockScreenNativeModule = {
  enable(): void;
  disable(): void;
  isEnabled(): Promise<boolean>;
  showNow(): void;
  unlock(): void;
  openApp(): void;
};

const LockScreen = (NativeModules as { LockScreen?: LockScreenNativeModule }).LockScreen;

export const lockScreenAvailable = Platform.OS === 'android' && !!LockScreen;

export function enableLockScreen(): void {
  LockScreen?.enable();
}

export function disableLockScreen(): void {
  LockScreen?.disable();
}

export async function isLockScreenEnabled(): Promise<boolean> {
  if (!LockScreen) return false;
  try {
    return await LockScreen.isEnabled();
  } catch {
    return false;
  }
}

/** 테스트용 — 잠금화면 퀴즈를 즉시 띄운다. */
export function showLockQuizNow(): void {
  LockScreen?.showNow();
}

/** 잠금화면 퀴즈 액티비티를 종료(스와이프 해제). */
export function unlockLockQuiz(): void {
  LockScreen?.unlock();
}

/** 메인 앱을 열고 잠금 액티비티를 종료. */
export function openAppFromLock(): void {
  LockScreen?.openApp();
}
