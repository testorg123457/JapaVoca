import {
  GRADE_ANIM, GRADE_COLOR, GRADE_FLAIR, GRADE_LABEL, GRADE_NOTE, GRADE_ORDER, summarizeBoxes,
} from '../src/lib/boxGrade';
import type { BoxItem } from '../src/api/hooks';

const box = (id: number, grade: BoxItem['grade'], burst = 1): BoxItem =>
  ({ id, grade, burst_count: burst });

describe('summarizeBoxes', () => {
  it('빈 목록·undefined는 빈 배열', () => {
    expect(summarizeBoxes([])).toEqual([]);
    expect(summarizeBoxes(undefined)).toEqual([]);
  });

  it('등급별로 세고, 0개인 등급은 뺀다', () => {
    expect(summarizeBoxes([box(1, 'normal'), box(2, 'normal'), box(3, 'blue')])).toEqual([
      { grade: 'normal', count: 2 },
      { grade: 'blue', count: 1 },
    ]);
  });

  it('낮은 등급이 앞 — 홈에서 왼쪽부터 일반·파랑·보라·버건디 순으로 놓인다', () => {
    const out = summarizeBoxes([
      box(1, 'burgundy'), box(2, 'purple'), box(3, 'normal'), box(4, 'blue'),
    ]);
    expect(out.map((g) => g.grade)).toEqual(['normal', 'blue', 'purple', 'burgundy']);
  });

  it('묶음 상자도 1개로 센다 — 인벤토리·광고 횟수가 1개이기 때문', () => {
    // burst_count 3이라고 3개로 세면 홈 개수와 실제 개봉 횟수가 어긋난다.
    expect(summarizeBoxes([box(1, 'burgundy', 3)])).toEqual([{ grade: 'burgundy', count: 1 }]);
  });

  it('합계는 항상 상자 개수와 같다', () => {
    const boxes = [box(1, 'normal'), box(2, 'purple', 3), box(3, 'blue'), box(4, 'normal')];
    const total = summarizeBoxes(boxes).reduce((s, g) => s + g.count, 0);
    expect(total).toBe(boxes.length);
  });
});

describe('등급 표시 정의', () => {
  it('모든 등급에 이름과 점 색이 있다 — 빠지면 홈에서 undefined가 찍힌다', () => {
    for (const grade of GRADE_ORDER) {
      expect(GRADE_LABEL[grade]).toBeTruthy();
      expect(GRADE_COLOR[grade]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('점 색은 서로 다르다 — 같으면 등급 구분이 안 된다', () => {
    expect(new Set(GRADE_ORDER.map((g) => GRADE_COLOR[g])).size).toBe(GRADE_ORDER.length);
  });
});

/**
 * 등급 연출은 **사다리**다 — 위로 갈수록 장치가 하나씩 켜진다.
 * 어두운 무대(방사 조명·링·비네트)를 버리고 밝은 화면용(글로우·반짝임)으로 갈아탔지만
 * 원칙은 같다: 제일 흔한 등급에 장치를 켜면 위 등급이 특별해지지 않는다.
 */
describe('등급 연출 사다리', () => {
  it('일반은 아무 연출도 없다', () => {
    expect(GRADE_FLAIR.normal.glow).toBe(0);
    expect(GRADE_FLAIR.normal.sparkles).toBe(0);
  });

  it('글로우는 등급이 올라갈수록 줄지 않는다', () => {
    const glows = GRADE_ORDER.map((g) => GRADE_FLAIR[g].glow);
    for (let i = 1; i < glows.length; i += 1) {
      expect(glows[i]).toBeGreaterThanOrEqual(glows[i - 1]);
    }
    expect(GRADE_FLAIR.burgundy.glow).toBeGreaterThan(GRADE_FLAIR.normal.glow);
  });

  it('반짝임은 보라부터 — 파랑까지는 글로우만으로 충분하다', () => {
    expect(GRADE_FLAIR.blue.sparkles).toBe(0);
    expect(GRADE_FLAIR.purple.sparkles).toBeGreaterThan(0);
    expect(GRADE_FLAIR.burgundy.sparkles).toBeGreaterThan(GRADE_FLAIR.purple.sparkles);
  });

  it('글로우가 과하지 않다 — 밝은 배경에서 번지면 상자가 묻힌다', () => {
    for (const grade of GRADE_ORDER) {
      expect(GRADE_FLAIR[grade].glow).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('등급별 애셋·문구', () => {
  it('등급마다 서로 다른 Lottie가 있다', () => {
    const anims = GRADE_ORDER.map((g) => GRADE_ANIM[g]);
    expect(anims.every(Boolean)).toBe(true);
    expect(new Set(anims).size).toBe(GRADE_ORDER.length);
  });

  it('결과 문구가 등급마다 있고 서로 다르다', () => {
    const notes = GRADE_ORDER.map((g) => GRADE_NOTE[g]);
    expect(notes.every((n) => n.length > 0)).toBe(true);
    expect(new Set(notes).size).toBe(GRADE_ORDER.length);
  });

  it('결과 문구에 돈 얘기를 넣지 않는다 — 환산하면 김이 샌다', () => {
    for (const grade of GRADE_ORDER) {
      expect(GRADE_NOTE[grade]).not.toMatch(/원|won|₩/i);
    }
  });
});
