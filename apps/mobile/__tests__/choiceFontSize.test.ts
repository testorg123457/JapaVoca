/**
 * 4지선다 글자 크기 테스트.
 *
 * 버그: 카드마다 자기 글자 수로 크기를 정해서, 2글자(26)와 3글자(22)가 한 화면에
 * 나란히 놓이면 크기가 눈에 띄게 달라 보였다. 크기는 문제 단위로 하나만 쓴다.
 */
import {
  CARD_INNER_W_DEFAULT,
  CARD_INNER_W_PANEL,
  CHOICE_MIN_FONT_SIZE,
  choiceFontSize,
} from '../src/screens/quiz/components/ChoiceCard';

/** 표가 예산(두 줄)을 지킬 수 있는 최대 글자 수. 그 뒤로는 하한에 머문다. */
const maxFitting = (w: number) => Math.floor((w * 2) / CHOICE_MIN_FONT_SIZE);

describe('choiceFontSize', () => {
  it('가장 긴 선택지 하나로 크기가 정해진다 — 순서와 무관', () => {
    const texts = ['勉強', '自動車', '学校', '図書館'];
    const size = choiceFontSize(texts);

    expect(choiceFontSize([...texts].reverse())).toBe(size);
    // 가장 긴 것만 남겨도 같은 크기
    expect(choiceFontSize(['自動車'])).toBe(size);
  });

  it('2글자와 3글자가 섞여도 한 크기로 통일된다', () => {
    // 예전 계단표에서 26 / 22로 갈리던 조합
    expect(choiceFontSize(['勉強', '自動車'])).toBe(choiceFontSize(['自動車', '勉強']));
  });

  it('2~4글자는 같은 크기 — 한자 단어 대부분이 이 구간이라 크기가 흔들리면 안 된다', () => {
    const two = choiceFontSize(['勉強']);
    expect(choiceFontSize(['自動車'])).toBe(two);
    expect(choiceFontSize(['図書館前'])).toBe(two);
  });

  it('5글자까지는 한 줄에 들어간다 — 360dp 카드 안쪽 폭 125px 기준', () => {
    for (let n = 1; n <= 5; n += 1) {
      expect(n * choiceFontSize(['가'.repeat(n)])).toBeLessThanOrEqual(125);
    }
  });

  it('6글자부터는 한 줄을 포기하고 크기를 지킨다 — 작게 밀어넣지 않는다', () => {
    // 6글자를 한 줄에 넣으려면 20px, 7글자는 17px까지 줄여야 한다. 그러지 않는다.
    expect(choiceFontSize(['가'.repeat(6)])).toBeGreaterThan(20);
    expect(choiceFontSize(['가'.repeat(7)])).toBeGreaterThan(17);
  });

  it('두 줄 예산 안에 들어간다 — 넘치면 카드 하나만 자동축소돼 통일이 깨진다', () => {
    for (let n = 1; n <= maxFitting(CARD_INNER_W_DEFAULT); n += 1) {
      expect(n * choiceFontSize(['가'.repeat(n)])).toBeLessThanOrEqual(CARD_INNER_W_DEFAULT * 2);
    }
  });

  it('좁은 카드(사진 테마)에서도 예산을 지킨다', () => {
    for (let n = 1; n <= maxFitting(CARD_INNER_W_PANEL); n += 1) {
      const size = choiceFontSize(['가'.repeat(n)], CARD_INNER_W_PANEL);
      expect(n * size).toBeLessThanOrEqual(CARD_INNER_W_PANEL * 2);
    }
  });

  it('예산을 못 맞추는 길이에서는 하한에 머문다 — 더 줄여서 못 읽게 만들지 않는다', () => {
    for (const n of [40, 80, 200]) {
      expect(choiceFontSize(['가'.repeat(n)])).toBe(CHOICE_MIN_FONT_SIZE);
    }
  });

  it('좁은 카드에서는 같은 글자수라도 더 작거나 같다', () => {
    for (let n = 1; n <= 30; n += 1) {
      const wide = choiceFontSize(['가'.repeat(n)], CARD_INNER_W_DEFAULT);
      const narrow = choiceFontSize(['가'.repeat(n)], CARD_INNER_W_PANEL);
      expect(narrow).toBeLessThanOrEqual(wide);
    }
  });

  it('두 줄이 카드 높이 안에 들어간다 — lineHeight 1.2 × 2줄 <= 68', () => {
    const tallest = choiceFontSize(['가']); // 가장 큰 크기
    expect(tallest * 1.2 * 2).toBeLessThanOrEqual(68);
  });

  it('글자가 길어지면 작아진다(단조 감소)', () => {
    const sizes = [1, 2, 5, 8, 11, 14, 20].map(n => choiceFontSize(['가'.repeat(n)]));
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    }
  });

  it('한 단계에 2px 넘게 떨어지지 않는다 — 한 글자 차이로 확 작아지면 안 된다', () => {
    for (let n = 1; n < 30; n += 1) {
      const drop = choiceFontSize(['가'.repeat(n)]) - choiceFontSize(['가'.repeat(n + 1)]);
      expect(drop).toBeLessThanOrEqual(2);
      expect(drop).toBeGreaterThanOrEqual(0);
    }
  });

  it('아주 길어도 하한 아래로는 안 내려간다', () => {
    expect(choiceFontSize(['가'.repeat(200)])).toBeGreaterThanOrEqual(CHOICE_MIN_FONT_SIZE);
  });

  it('서로게이트 쌍(이모지 등)을 한 글자로 센다', () => {
    expect(choiceFontSize(['🎌'])).toBe(choiceFontSize(['一']));
  });

  it('빈 배열이어도 죽지 않는다', () => {
    expect(() => choiceFontSize([])).not.toThrow();
    expect(choiceFontSize([])).toBeGreaterThan(0);
  });
});
