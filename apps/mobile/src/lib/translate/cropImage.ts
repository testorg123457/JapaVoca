/**
 * 크롭 기하 — 오버레이(화면 좌표) 사각형 ↔ 이미지 픽셀 좌표 변환 + crop 실행.
 *
 * 이미지는 crop 화면에서 resizeMode="contain"으로 뷰에 맞춰지므로,
 * 좌표 변환은 레터박스(빈 여백) 오프셋을 보정해야 한다.
 */
import ImageEditor from '@react-native-community/image-editor';

export type Rect = { x: number; y: number; width: number; height: number };

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
  // 모서리를 각각 반올림한 뒤 폭·높이를 파생 — 독립 반올림으로 경계를 1px 넘는 것 방지.
  const px = Math.round(left / scale);
  const py = Math.round(top / scale);
  const pr = Math.round(right / scale);
  const pb = Math.round(bottom / scale);
  return { x: px, y: py, width: pr - px, height: pb - py };
}

export async function cropToRect(uri: string, pixel: Rect): Promise<string> {
  const result = await ImageEditor.cropImage(uri, {
    offset: { x: pixel.x, y: pixel.y },
    size: { width: pixel.width, height: pixel.height },
  });
  return typeof result === 'string' ? result : result.uri;
}
