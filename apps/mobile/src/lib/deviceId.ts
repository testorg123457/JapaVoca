/**
 * 기기 식별자 — 추천인 보상 기기당 1회 제한에 쓴다.
 *
 * ANDROID_ID(Settings.Secure.ANDROID_ID)를 쓴다. 앱 서명키 기준으로 고정돼서
 * **앱을 지웠다 다시 깔아도 유지**되고, 공장초기화해야 바뀐다.
 * (앱이 만든 UUID는 재설치하면 새로 생겨 파밍을 못 막는다.)
 *
 * ⚠️ 이 값은 클라가 보내는 것이라 위조 가능하다. 완전한 방어가 아니라 흔한
 *    부계정 파밍을 비싸게 만드는 장치다. 근본 해결은 Play Integrity.
 *
 * 의존성 `react-native-device-info` 추가 이유: ANDROID_ID를 읽기 위해(네이티브 모듈).
 */
import { getAndroidId } from 'react-native-device-info';

let cached: string | null = null;

/** 기기 식별자. 읽지 못하면 빈 문자열(서버가 거부한다). */
export async function getDeviceId(): Promise<string> {
  if (cached !== null) {
    return cached;
  }
  try {
    const id = await getAndroidId();
    cached = typeof id === 'string' ? id : '';
  } catch {
    cached = '';
  }
  return cached;
}
