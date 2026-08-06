import {
  ART_RATIO,
  boxBurstHeight,
  boxBurstLayout,
  boxStageTouchPad,
  boxTouchArea,
  MAX_BOX_SIZE,
  slotRect,
} from '../src/screens/quiz/boxBurstLayout';

const PHONE_W = 390; // 무대는 화면 폭을 다 쓴다

describe('boxBurstLayout', () => {
  it('낱개는 상자 하나만, 화면 중앙에', () => {
    const slots = boxBurstLayout(1, PHONE_W);
    expect(slots).toHaveLength(1);
    expect(slots[0].dx).toBe(0);
    expect(slots[0].size).toBe(Math.min(MAX_BOX_SIZE, PHONE_W));
  });

  it('묶음은 상자 3개', () => {
    expect(boxBurstLayout(3, PHONE_W)).toHaveLength(3);
  });

  it('가운데가 가장 크고 가장 앞에 온다', () => {
    const [left, center, right] = boxBurstLayout(3, PHONE_W);
    expect(center.size).toBeGreaterThan(left.size);
    expect(center.size).toBeGreaterThan(right.size);
    expect(center.z).toBeGreaterThan(left.z);
    expect(center.z).toBeGreaterThan(right.z);
  });

  it('양옆은 위로 물러난다 — 뒤에 있는 느낌', () => {
    const [left, center, right] = boxBurstLayout(3, PHONE_W);
    expect(left.dy).toBeLessThan(0);
    expect(right.dy).toBeLessThan(0);
    expect(center.dy).toBe(0);
  });

  it('반투명은 쓰지 않는다 — 크기·위치·겹침만으로 원근을 낸다', () => {
    for (const slot of boxBurstLayout(3, PHONE_W)) {
      expect(slot.opacity).toBe(1);
    }
  });

  it('좌우 대칭이다', () => {
    const [left, , right] = boxBurstLayout(3, PHONE_W);
    expect(left.dx).toBe(-right.dx);
    expect(left.size).toBe(right.size);
    expect(left.dy).toBe(right.dy);
  });

  it('옆 상자는 가운데와 붙어 있되 파고들지 않는다', () => {
    const [left, center] = boxBurstLayout(3, PHONE_W);
    const gap = (-center.size / 2) - (left.dx + left.size / 2);
    // 살짝 떨어져 있거나 맞닿는 정도. 크게 벌어지면 세 개가 한 무리로 안 읽힌다.
    expect(gap).toBeGreaterThan(-center.size * 0.2);
    expect(gap).toBeLessThan(center.size * 0.25);
  });

  it('여러 화면 폭에서 3개가 화면 밖으로 나가지 않는다', () => {
    for (const avail of [280, 320, 342, 400, 500, 720]) {
      const slots = boxBurstLayout(3, avail);
      for (const s of slots) {
        expect(Math.abs(s.dx) + s.size / 2).toBeLessThanOrEqual(avail / 2 + 0.5);
      }
    }
  });

  it('낱개는 상한 크기로 그려진다', () => {
    const one = boxBurstLayout(1, 2000)[0];
    expect(one.size).toBe(MAX_BOX_SIZE);
    expect(one.viewSize).toBe(Math.round(MAX_BOX_SIZE / ART_RATIO));
  });

  it('3개일 때 가운데가 양옆보다 크다', () => {
    const [left, center, right] = boxBurstLayout(3, 2000);
    expect(center.size).toBeGreaterThan(left.size);
    expect(center.size).toBeGreaterThan(right.size);
  });

  it('옆 상자가 가운데에 가려지지 않는다 — 3개로 읽혀야 한다', () => {
    // (탭은 무대 전체 하나로 받으므로 '개별로 겨냥 가능한가'는 더 이상 조건이 아니다.
    //  다만 옆 상자가 완전히 묻히면 셋으로 안 보이므로 드러난 폭은 여전히 확인한다.)
    const [left, center] = boxBurstLayout(3, PHONE_W);
    const exposed = (center.dx - center.size / 2) - (left.dx - left.size / 2);
    expect(exposed).toBeGreaterThanOrEqual(44);
  });

  it('옆 상자는 가운데의 80% — 예전(72%)보다 키웠다', () => {
    const [left, center] = boxBurstLayout(3, PHONE_W);
    expect(left.size / center.size).toBeCloseTo(0.8, 1);
    expect(left.size / center.size).toBeGreaterThan(0.72);
  });

  it('폭이 0 이하로 들어와도 죽지 않는다', () => {
    expect(boxBurstLayout(3, 0)).toHaveLength(1);
  });

  it('높이는 가장 큰 상자 + 위로 물러난 만큼', () => {
    const slots = boxBurstLayout(3, PHONE_W);
    const center = slots[1];
    expect(boxBurstHeight(slots)).toBeGreaterThanOrEqual(center.size);
  });

  it('Lottie 뷰는 보이는 상자보다 훨씬 크다 — 그림이 캔버스 일부만 쓰기 때문', () => {
    for (const slot of boxBurstLayout(3, PHONE_W)) {
      expect(slot.viewSize).toBeGreaterThan(slot.size * 3);
      expect(slot.viewSize).toBe(Math.round(slot.size / ART_RATIO));
    }
  });
});

describe('boxTouchArea — 단일 탭 영역', () => {
  const stageH = (slots: ReturnType<typeof boxBurstLayout>) => boxBurstHeight(slots);

  it('보이는 상자를 전부 품는다 — 눌러서 열리던 자리를 뺏지 않는다', () => {
    for (const count of [1, 3]) {
      const slots = boxBurstLayout(count, PHONE_W);
      const h = stageH(slots);
      const area = boxTouchArea(slots, PHONE_W, h);
      for (const s of slots) {
        const vis = slotRect(s, PHONE_W, h);
        expect(area.x).toBeLessThanOrEqual(vis.x);
        expect(area.y).toBeLessThanOrEqual(vis.y);
        expect(area.x + area.w).toBeGreaterThanOrEqual(vis.x + vis.w);
        expect(area.y + area.h).toBeGreaterThanOrEqual(vis.y + vis.h);
      }
    }
  });

  it('아래로 더 많이 넓힌다 — 그림이 사각형보다 아래에 그려지므로', () => {
    const slots = boxBurstLayout(1, PHONE_W);
    const h = stageH(slots);
    const vis = slotRect(slots[0], PHONE_W, h);
    const area = boxTouchArea(slots, PHONE_W, h);
    const padTop = vis.y - area.y;
    const padBottom = (area.y + area.h) - (vis.y + vis.h);
    expect(padBottom).toBeGreaterThan(padTop);
  });

  it('낱개도 넓어지되 과하지 않다 — 화면 절반이 버튼이 되면 안 된다', () => {
    const slots = boxBurstLayout(1, PHONE_W);
    const h = stageH(slots);
    const vis = slotRect(slots[0], PHONE_W, h);
    const area = boxTouchArea(slots, PHONE_W, h);
    const ratio = (area.w * area.h) / (vis.w * vis.h);
    expect(ratio).toBeGreaterThan(2);   // 예전보다 넓다
    expect(ratio).toBeLessThan(4);      // 그래도 적당히
    expect(area.w).toBeLessThan(PHONE_W * 0.55);
  });

  it('묶음은 낱개보다 훨씬 넓게 잡는다 — 어느 상자를 눌렀나 가릴 필요가 없다', () => {
    const one = boxBurstLayout(1, PHONE_W);
    const three = boxBurstLayout(3, PHONE_W);
    const a1 = boxTouchArea(one, PHONE_W, stageH(one));
    const a3 = boxTouchArea(three, PHONE_W, stageH(three));
    expect(a3.w).toBeGreaterThan(a1.w * 1.8);
  });

  it('무대 밖으로 나가지 않는다 — 안드로이드는 부모 밖 터치를 안 준다', () => {
    for (const count of [1, 3]) {
      for (const w of [280, 320, 390, 500]) {
        const slots = boxBurstLayout(count, w);
        const area = boxTouchArea(slots, w, stageH(slots));
        expect(area.x).toBeGreaterThanOrEqual(0);
        expect(area.x + area.w).toBeLessThanOrEqual(w);
      }
    }
  });

  it('무대 여유분은 아래로 넓힌 양을 덮는다', () => {
    for (const count of [1, 3]) {
      const slots = boxBurstLayout(count, PHONE_W);
      const h = stageH(slots);
      const area = boxTouchArea(slots, PHONE_W, h);
      expect(area.y + area.h).toBeLessThanOrEqual(h + boxStageTouchPad(slots));
    }
  });
});
