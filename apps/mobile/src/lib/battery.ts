/**
 * 배터리 사용량 최적화 제외(doze mode 면제) 네이티브 모듈 래퍼.
 * 모듈이 없거나 Android가 아니면 허용됨으로 간주(필수 권한이지만 빌드 전엔 모듈 없음).
 */
import { NativeModules, Platform } from 'react-native';

type BatteryNativeModule = {
  isIgnoring(): Promise<boolean>;
  requestExemption(): void;
};

const BatteryOptimization = (NativeModules as { BatteryOptimization?: BatteryNativeModule })
  .BatteryOptimization;

export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BatteryOptimization) {
    return true;
  }
  try {
    return await BatteryOptimization.isIgnoring();
  } catch {
    return false;
  }
}

export function requestBatteryExemption(): void {
  if (Platform.OS === 'android' && BatteryOptimization) {
    BatteryOptimization.requestExemption();
  }
}
