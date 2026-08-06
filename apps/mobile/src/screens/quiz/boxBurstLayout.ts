/**
 * 묶음 상자 배치 — 원근감 있는 3개 배열.
 *
 * 가운데 상자는 크고 앞에, 양옆은 작고 뒤에(위쪽으로 살짝 물러나고 반투명).
 * 원근은 크기 + 세로 위치 + 겹침 세 가지로 낸다.
 *
 * ⚠️ size는 "실제 눈에 보이는 상자 크기"다. Lottie 뷰 크기가 아니다.
 *    상자 그림은 1150 캔버스의 가운데 약 28%만 쓰고 나머지는 빈 여백이라,
 *    뷰 크기를 그대로 상자 크기로 쓰면 아무리 키워도 상자가 안 커 보인다.
 *    그래서 뷰는 size / ART_RATIO 로 크게 그리고(바깥은 빈 캔버스라 잘려도 무해),
 *    레이아웃·탭 판정은 size(=보이는 상자)로 한다.
 *
 * ⚠️ 순수함수 — 테스트 있음(`__tests__/boxBurstLayout.test.ts`).
 */

export type BoxSlot = {
  /** 화면 중앙 기준 가로 오프셋(px). 음수면 왼쪽. */
  dx: number;
  /** 세로 오프셋(px). 음수면 위(=뒤에 있는 느낌). */
  dy: number;
  /** 눈에 보이는 상자 크기(레이아웃·탭 판정 기준) */
  size: number;
  /** Lottie 뷰 크기 — size보다 훨씬 크다. 바깥은 빈 캔버스. */
  viewSize: number;
  /** 겹침 순서 — 가운데가 가장 앞. */
  z: number;
  opacity: number;
};

/** 상자 그림이 Lottie 캔버스에서 차지하는 가로 비율(실측: 315/1150). */
export const ART_RATIO = 0.28;

/** 낱개 상자 크기(보이는 크기). 원래 값 81(Lottie 뷰 290)에서 키운 값. */
export const MAX_BOX_SIZE = 108;

/** 3개일 때 가운데 상자 — 낱개보다 조금 크게. */
const BURST_CENTER = 104;

const SIDE_RATIO = 0.8; // 옆 상자 크기 = 가운데의 80%
// 옆 상자를 충분히 벌린다. 너무 겹치면 셋이 한 덩어리로 뭉개져 보인다.
const SIDE_DX = 0.92;
const SIDE_DY = -0.15; // 위로 물러남 — 뒤에 있는 느낌
const SIDE_OPACITY = 1; // 반투명하게 두지 않는다 — 크기·위치·겹침만으로 원근을 낸다

function slot(dx: number, dy: number, size: number, z: number, opacity: number): BoxSlot {
  return { dx, dy, size, viewSize: Math.round(size / ART_RATIO), z, opacity };
}

/**
 * @param count 보상 개수(1 또는 3). 그 외 값은 1/3으로 맞춘다.
 * @param availWidth 상자를 놓을 수 있는 가로 폭
 */
export function boxBurstLayout(count: number, availWidth: number): BoxSlot[] {
  const single = [slot(0, 0, Math.min(MAX_BOX_SIZE, availWidth), 2, 1)];
  if (count < 2 || availWidth <= 0) {
    return single;
  }

  // 가장 바깥 끝 = SIDE_DX*c + (SIDE_RATIO*c)/2 = 1.32c 이므로 c ≤ availWidth/2.64.
  // 좁은 화면에서만 이 상한이 걸린다.
  const center = Math.round(Math.min(BURST_CENTER, availWidth / 2.64));
  const side = Math.round(center * SIDE_RATIO);
  const dx = Math.round(center * SIDE_DX);
  const dy = Math.round(center * SIDE_DY);

  return [
    slot(-dx, dy, side, 1, SIDE_OPACITY),
    slot(0, 0, center, 2, 1),
    slot(dx, dy, side, 1, SIDE_OPACITY),
  ];
}

/** 배치가 차지하는 전체 높이 — 레이아웃 자리를 미리 잡는 데 쓴다. */
export function boxBurstHeight(slots: BoxSlot[]): number {
  return Math.max(...slots.map((s) => s.size + Math.abs(Math.min(0, s.dy))));
}

/** 슬롯이 무대 안에서 차지하는 사각형(보이는 상자 기준). */
export function slotRect(s: BoxSlot, stageW: number, stageH: number) {
  const x = stageW / 2 + s.dx - s.size / 2;
  const y = stageH - s.size + s.dy;
  return { x, y, w: s.size, h: s.size };
}

/**
 * 탭 영역 여백(보이는 상자 크기 대비).
 *
 * ⚠️ 탭 영역을 '보이는 상자' 사각형과 똑같이 두면 상자 위쪽을 눌러야만 열린다.
 *    Lottie 그림이 캔버스 정중앙이 아니라 아래로 치우쳐 있어서, 눈에 보이는 상자가
 *    사각형보다 아래에 그려지기 때문이다. 그래서 아래로 더 크게 넓힌다.
 *
 * ⚠️ 묶음은 **더 크게** 잡는다. 탭 한 번에 셋이 다 열리므로 옆 상자를 개별로 겨냥할
 *    이유가 없어졌고, 그래서 이웃 영역과 겹쳐도 상관없다(예전엔 겹치면 엉뚱한 상자가
 *    열려서 가로를 3%밖에 못 넓혔다).
 * ⚠️ 낱개는 적당히만. 화면 절반이 버튼처럼 되면 어디를 눌러도 열려서 오히려 이상하다.
 */
type TouchPad = { x: number; top: number; bottom: number };
export const SINGLE_TOUCH_PAD: TouchPad = { x: 0.22, top: 0.28, bottom: 0.75 };
export const BURST_TOUCH_PAD: TouchPad = { x: 0.3, top: 0.35, bottom: 0.85 };

/** 슬롯 개수에 맞는 여백. */
export function touchPadFor(slotCount: number): TouchPad {
  return slotCount > 1 ? BURST_TOUCH_PAD : SINGLE_TOUCH_PAD;
}

/** 한 슬롯의 탭 영역. 그림은 그대로 두고 누를 수 있는 범위만 넓힌다. */
export function slotTouchRect(
  s: BoxSlot,
  stageW: number,
  stageH: number,
  pad: TouchPad = SINGLE_TOUCH_PAD,
) {
  const r = slotRect(s, stageW, stageH);
  const padX = Math.round(s.size * pad.x);
  const padTop = Math.round(s.size * pad.top);
  const padBottom = Math.round(s.size * pad.bottom);
  return {
    x: r.x - padX,
    y: r.y - padTop,
    w: r.w + padX * 2,
    h: r.h + padTop + padBottom,
  };
}

/**
 * 상자 전체를 덮는 **하나의** 탭 영역(= 각 슬롯 탭 영역의 합집합).
 *
 * 탭 한 번에 남은 상자를 전부 열기 때문에 판정도 하나면 된다. 슬롯마다 Pressable을
 * 두던 예전 방식은 "어느 상자를 눌렀나"를 가려야 해서 영역을 좁게 잡을 수밖에 없었다.
 *
 * 가로는 무대 밖으로 나가지 않게 자른다 — 안드로이드는 부모 밖 터치를 자식에게 안 준다.
 */
export function boxTouchArea(slots: BoxSlot[], stageW: number, stageH: number) {
  const pad = touchPadFor(slots.length);
  const rects = slots.map((s) => slotTouchRect(s, stageW, stageH, pad));
  const left = Math.max(0, Math.min(...rects.map((r) => r.x)));
  const right = Math.min(stageW, Math.max(...rects.map((r) => r.x + r.w)));
  // ⚠️ 위쪽은 무대 밖으로 넘기지 않는다. 안드로이드는 부모 밖 터치를 자식에게 안 줘서
  //    어차피 죽은 영역인데, 위로 삐져나가면 상단 X 버튼 근처를 덮을 위험만 생긴다.
  const top = Math.max(0, Math.min(...rects.map((r) => r.y)));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * 탭 영역이 무대 아래로 삐져나가는 양.
 *
 * ⚠️ 안드로이드는 부모 밖의 터치를 자식에게 안 준다. 아래로 넓힌 만큼 무대 높이를
 *    늘려야 실제로 눌린다(늘린 만큼은 marginBottom 음수로 상쇄해 그림 위치는 유지).
 */
export function boxStageTouchPad(slots: BoxSlot[]): number {
  const pad = touchPadFor(slots.length);
  return Math.round(Math.max(...slots.map((s) => s.size)) * pad.bottom);
}
