/**
 * 권한 헬퍼 — 필수(알림)는 런타임 권한(PermissionsAndroid),
 * 오버레이는 별도(lib/overlay). 새 JS 의존성 없이 RN 내장 API만 사용한다.
 *
 * POST_NOTIFICATIONS 는 Android 13(API 33)+ 에서만 런타임 요청 대상이고
 * 그 이하 버전은 자동 허용으로 간주한다.
 */
import { Linking, PermissionsAndroid, Platform } from 'react-native';

export { isIgnoringBatteryOptimizations } from './battery';
export { requestBatteryExemption } from './battery';

export type PermResult = 'granted' | 'denied' | 'blocked';

export function mapAndroidResult(r: string): PermResult {
  if (r === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  if (r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }
  return 'denied';
}

function apiLevel(): number {
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10);
}

export async function checkNotification(): Promise<boolean> {
  if (Platform.OS !== 'android' || apiLevel() < 33) {
    return true;
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export async function requestNotification(): Promise<PermResult> {
  if (Platform.OS !== 'android' || apiLevel() < 33) {
    return 'granted';
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return mapAndroidResult(r);
}

export async function requestCamera(): Promise<PermResult> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return mapAndroidResult(r);
}

/** 필수 권한(알림) 허용 여부.
 * 배터리 최적화 제외는 Samsung One UI에서 API가 false를 반환하는 케이스가 있어 게이트에서 제외.
 * 잠금화면 설정 화면에서 별도 안내한다. */
export async function checkRequiredPermissions(): Promise<boolean> {
  return checkNotification();
}

export function openAppSettings(): void {
  Linking.openSettings();
}
