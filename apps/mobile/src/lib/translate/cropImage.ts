/**
 * 크롭 기하 — 오버레이(화면 좌표) 사각형 ↔ 이미지 픽셀 좌표 변환 + crop 실행.
 *
 * 이미지는 crop 화면에서 resizeMode="contain"으로 뷰에 맞춰지므로,
 * 좌표 변환은 레터박스(빈 여백) 오프셋을 보정해야 한다.
 */
import ImageEditor from '@react-native-community/image-editor';

export type Rect = { x: number; y: number; width: number; height: number };

/** 드래그 사각형을 뷰 경계 안으로 클램프하고 최소 크기를 보장. */
export function clampRect(
  rect: Rect,
  bounds: { width: number; height: number },
  min: number,
): Rect {
  const width = Math.max(min, Math.min(rect.width, bounds.width));
  const height = Math.max(min, Math.min(rect.height, bounds.height));
  const x = Math.max(0, Math.min(rect.x, bounds.width - width));
  const y = Math.max(0, Math.min(rect.y, bounds.height - height));
  return { x, y, width, height };
}

/** 오버레이(뷰 좌표) 사각형을 원본 이미지 픽셀 좌표로 변환. contain 레터박스 보정. */
export function toPixelRect(
  overlay: Rect,
  view: { width: number; height: number },
  image: { width: number; height: number },
): Rect {
  const scale = Math.min(view.width / image.width, view.height / image.height);
  const shownW = image.width * scale;
  const shownH = image.height * scale;
  const offsetX = (view.width - shownW) / 2;
  const offsetY = (view.height - shownH) / 2;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const left = clamp(overlay.x - offsetX, 0, shownW);
  const top = clamp(overlay.y - offsetY, 0, shownH);
  const right = clamp(overlay.x + overlay.width - offsetX, 0, shownW);
  const bottom = clamp(overlay.y + overlay.height - offsetY, 0, shownH);
  return {
    x: Math.round(left / scale),
    y: Math.round(top / scale),
    width: Math.round((right - left) / scale),
    height: Math.round((bottom - top) / scale),
  };
}

export async function cropToRect(uri: string, pixel: Rect): Promise<string> {
  const result = await ImageEditor.cropImage(uri, {
    offset: { x: pixel.x, y: pixel.y },
    size: { width: pixel.width, height: pixel.height },
  });
  return typeof result === 'string' ? result : result.uri;
}
