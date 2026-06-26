/**
 * 네이티브 오버레이 권한 모듈(OverlayPermission) 래퍼.
 * 모듈이 없거나(미빌드) Android가 아니면 '허용됨'으로 간주해 게이트를 막지 않는다
 * (오버레이는 권장 항목이므로).
 */
import { NativeModules, Platform } from 'react-native';

type OverlayNativeModule = {
  canDrawOverlays(): Promise<boolean>;
  requestOverlayPermission(): void;
};

const OverlayPermission = (NativeModules as { OverlayPermission?: OverlayNativeModule })
  .OverlayPermission;

export async function canDrawOverlays(): Promise<boolean> {
  if (Platform.OS !== 'android' || !OverlayPermission) {
    return true;
  }
  try {
    return await OverlayPermission.canDrawOverlays();
  } catch {
    return false;
  }
}

export function requestOverlayPermission(): void {
  if (Platform.OS === 'android' && OverlayPermission) {
    OverlayPermission.requestOverlayPermission();
  }
}
