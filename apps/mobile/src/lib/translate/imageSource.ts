/**
 * 이미지 확보 — 카메라 촬영 / 갤러리 선택 (react-native-image-picker 래퍼).
 *
 * 원본 화질을 유지한다(리사이즈·base64 미포함): 크롭 좌표를 이미지 픽셀에
 * 정확히 매핑하려면 표시 이미지와 실제 픽셀 비율이 어긋나면 안 되기 때문.
 */
import {
  launchCamera,
  launchImageLibrary,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';

import { requestCamera } from '../permissions';

export type PickedImage = { uri: string; width: number; height: number };

export function buildPickerOptions(): ImageLibraryOptions {
  // 8MB 서버 상한 아래로 확실히 들어오게 다운스케일(OCR엔 2048px면 충분).
  return {
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: false,
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.8,
  };
}

/**
 * 취소면 null, 정상이면 이미지. 사진은 골랐지만 uri/치수를 못 읽으면(일부 안드로이드
 * content-uri) 'unreadable-image'를 throw — 조용한 무반응 대신 에러로 안내되게.
 */
export function firstAsset(res: ImagePickerResponse): PickedImage | null {
  if (res.didCancel) {
    return null;
  }
  const a = res.assets?.[0];
  if (!a) {
    return null;
  }
  if (!a.uri || !a.width || !a.height) {
    throw new Error('unreadable-image');
  }
  return { uri: a.uri, width: a.width, height: a.height };
}

export async function pickFromGallery(): Promise<PickedImage | null> {
  return firstAsset(await launchImageLibrary(buildPickerOptions()));
}

/**
 * 카메라 촬영. 권한 상태에 따라 구분해서 throw:
 *  - 영구 차단('blocked') → 'permission-blocked' (설정에서 켜야 함)
 *  - 단순 거부('denied')  → 'permission-denied' (이번에만 거부)
 */
export async function pickFromCamera(): Promise<PickedImage | null> {
  const perm = await requestCamera();
  if (perm === 'blocked') {
    throw new Error('permission-blocked');
  }
  if (perm !== 'granted') {
    throw new Error('permission-denied');
  }
  return firstAsset(await launchCamera(buildPickerOptions()));
}
