// 네이티브 모듈은 jest 환경에 없으므로 목으로 대체(순수 좌표 수학만 테스트).
jest.mock('@react-native-community/image-editor', () => ({}));

import { toPixelRect } from '../src/lib/translate/cropImage';

describe('toPixelRect (contain 레터박스 보정)', () => {
  it('가로 꽉·세로 레터박스', () => {
    const view = { width: 400, height: 400 };
    const image = { width: 800, height: 400 }; // scale 0.5, 표시 400x200, 세로여백 100
    expect(toPixelRect({ x: 0, y: 100, width: 200, height: 100 }, view, image))
      .toEqual({ x: 0, y: 0, width: 400, height: 200 });
  });

  it('세로 꽉·가로 레터박스', () => {
    const view = { width: 400, height: 400 };
    const image = { width: 400, height: 800 }; // scale 0.5, 표시 200x400, 가로여백 100
    expect(toPixelRect({ x: 100, y: 0, width: 100, height: 400 }, view, image))
      .toEqual({ x: 0, y: 0, width: 200, height: 800 });
  });

  it('표시영역 밖(레터박스)은 이미지 경계로 클램프', () => {
    const view = { width: 400, height: 400 };
    const image = { width: 800, height: 400 };
    const px = toPixelRect({ x: 0, y: 0, width: 400, height: 50 }, view, image);
    expect(px.y).toBe(0);
    expect(px.height).toBeGreaterThanOrEqual(0);
  });

  it('전체 선택 시 원본 전체 픽셀', () => {
    const view = { width: 300, height: 600 };
    const image = { width: 300, height: 600 }; // scale 1
    expect(toPixelRect({ x: 0, y: 0, width: 300, height: 600 }, view, image))
      .toEqual({ x: 0, y: 0, width: 300, height: 600 });
  });
});
