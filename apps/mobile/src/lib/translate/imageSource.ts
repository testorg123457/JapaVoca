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
  return { mediaType: 'photo', selectionLimit: 1, includeBase64: false };
}

export function firstAsset(res: ImagePickerResponse): PickedImage | null {
  if (res.didCancel) {
    return null;
  }
  const a = res.assets?.[0];
  if (!a?.uri || !a.width || !a.height) {
    return null;
  }
  return { uri: a.uri, width: a.width, height: a.height };
}

export async function pickFromGallery(): Promise<PickedImage | null> {
  return firstAsset(await launchImageLibrary(buildPickerOptions()));
}

/** 카메라 권한이 막혀 있으면 'permission-blocked'를 throw. */
export async function pickFromCamera(): Promise<PickedImage | null> {
  const perm = await requestCamera();
  if (perm !== 'granted') {
    throw new Error('permission-blocked');
  }
  return firstAsset(await launchCamera(buildPickerOptions()));
}
