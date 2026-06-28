/**
 * 상시 학습 알림 네이티브 모듈(StudyNotification) 래퍼.
 * 모듈이 없거나(빌드 전/iOS) Android가 아니면 no-op.
 *
 * 네이티브(android StudyNotificationModule):
 *  - start(): 포그라운드 서비스 시작 → 상단 알림바에 고정 알림 표시
 *  - stop():  포그라운드 서비스 중지 → 알림 제거
 */
import { NativeModules, Platform } from 'react-native';

type StudyNotificationNativeModule = {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
};

const StudyNotification = (
  NativeModules as { StudyNotification?: StudyNotificationNativeModule }
).StudyNotification;

export function startStudyNotification(): void {
  if (Platform.OS === 'android') StudyNotification?.start();
}

export function stopStudyNotification(): void {
  if (Platform.OS === 'android') StudyNotification?.stop();
}
