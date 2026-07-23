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
export const MAX_BOX_SIZE = 86;

/** 3개일 때 가운데 상자 — 낱개보다 조금 크게. */
const BURST_CENTER = 112;

const SIDE_RATIO = 0.72; // 옆 상자 크기 = 가운데의 72%
// 옆 상자를 충분히 벌린다. 너무 겹치면 드러난 부분이 없어 탭할 수가 없다.
const SIDE_DX = 0.92;
const SIDE_DY = -0.15; // 위로 물러남 — 옆 상자 윗부분이 드러나 탭할 곳이 생긴다
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

  // 가장 바깥 끝 = SIDE_DX*c + (SIDE_RATIO*c)/2 = 1.28c 이므로 c ≤ availWidth/2.56.
  // 좁은 화면에서만 이 상한이 걸린다.
  const center = Math.round(Math.min(BURST_CENTER, availWidth / 2.56));
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
