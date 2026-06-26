/**
 * 권한 헬퍼 — 필수(알림·휴대폰번호)는 런타임 권한(PermissionsAndroid),
 * 오버레이는 별도(lib/overlay). 새 JS 의존성 없이 RN 내장 API만 사용한다.
 *
 * POST_NOTIFICATIONS 는 Android 13(API 33)+ 에서만 런타임 요청 대상이고
 * 그 이하 버전은 자동 허용으로 간주한다. READ_PHONE_NUMBERS 는 dangerous 권한.
 */
import { Linking, PermissionsAndroid, Platform } from 'react-native';

import { isIgnoringBatteryOptimizations } from './battery';
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

export async function checkPhone(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);
}

export async function requestPhone(): Promise<PermResult> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);
  return mapAndroidResult(r);
}

/** 필수 권한(알림 + 번호 + 배터리 최적화 제외) 모두 허용 여부. */
export async function checkRequiredPermissions(): Promise<boolean> {
  const [notification, phone, battery] = await Promise.all([
    checkNotification(),
    checkPhone(),
    isIgnoringBatteryOptimizations(),
  ]);
  return notification && phone && battery;
}

export function openAppSettings(): void {
  Linking.openSettings();
}
