import {
  ART_RATIO,
  boxBurstHeight,
  boxBurstLayout,
  MAX_BOX_SIZE,
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

  it('3개일 때 가운데는 낱개보다 크다 — 조금만', () => {
    const center = boxBurstLayout(3, 2000)[1];
    expect(center.size).toBeGreaterThan(MAX_BOX_SIZE);
    expect(center.size).toBeLessThan(MAX_BOX_SIZE * 1.4);
  });

  it('옆 상자는 탭할 수 있을 만큼 드러난다(가로 44px 이상)', () => {
    const [left, center] = boxBurstLayout(3, PHONE_W);
    const exposed = (center.dx - center.size / 2) - (left.dx - left.size / 2);
    expect(exposed).toBeGreaterThanOrEqual(44);
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
