import { formatTime, groupByDate, relativeTime, sectionTitle } from '../src/lib/dateSections';

const NOW = new Date('2026-07-23T15:00:00');
const at = (iso: string) => ({ created_at: iso });

describe('sectionTitle', () => {
  it('오늘·어제는 날짜 대신 말로', () => {
    expect(sectionTitle('2026-07-23T09:00:00', NOW)).toBe('오늘');
    expect(sectionTitle('2026-07-22T23:59:00', NOW)).toBe('어제');
  });

  it('그 이전은 월·일·요일', () => {
    expect(sectionTitle('2026-07-18T10:00:00', NOW)).toBe('7월 18일 (토)');
  });

  it('해가 다르면 연도를 붙인다', () => {
    expect(sectionTitle('2025-12-03T10:00:00', NOW)).toBe('2025.12월 3일 (수)');
  });

  it('같은 날이면 시각과 무관하게 오늘', () => {
    expect(sectionTitle('2026-07-23T00:00:01', NOW)).toBe('오늘');
    expect(sectionTitle('2026-07-23T23:59:59', NOW)).toBe('오늘');
  });

  it('달을 넘긴 어제도 어제로 본다', () => {
    expect(sectionTitle('2026-06-30T10:00:00', new Date('2026-07-01T09:00:00'))).toBe('어제');
  });
});

describe('groupByDate', () => {
  it('같은 날짜끼리 묶는다', () => {
    const sections = groupByDate(
      [at('2026-07-23T15:00:00'), at('2026-07-23T09:00:00'), at('2026-07-22T20:00:00')],
      (x) => x.created_at,
      NOW,
    );
    expect(sections.map((s) => s.title)).toEqual(['오늘', '어제']);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].data).toHaveLength(1);
  });

  it('원래 순서를 바꾸지 않는다 — 서버 정렬을 신뢰한다', () => {
    const items = [at('2026-07-23T09:00:00'), at('2026-07-23T15:00:00')];
    const [today] = groupByDate(items, (x) => x.created_at, NOW);
    expect(today.data.map((d) => d.created_at)).toEqual([
      '2026-07-23T09:00:00',
      '2026-07-23T15:00:00',
    ]);
  });

  it('날짜가 다시 나타나면 섹션도 다시 만든다(정렬이 흐트러진 경우)', () => {
    const sections = groupByDate(
      [at('2026-07-23T15:00:00'), at('2026-07-22T20:00:00'), at('2026-07-23T08:00:00')],
      (x) => x.created_at,
      NOW,
    );
    expect(sections.map((s) => s.title)).toEqual(['오늘', '어제', '오늘']);
  });

  it('빈 목록은 빈 섹션', () => {
    expect(groupByDate([], (x: { created_at: string }) => x.created_at, NOW)).toEqual([]);
  });
});

describe('formatTime', () => {
  it('시간만, 두 자리로', () => {
    expect(formatTime('2026-07-23T09:05:00')).toBe('09:05');
    expect(formatTime('2026-07-23T23:59:00')).toBe('23:59');
  });
});

describe('relativeTime', () => {
  it('1분 안쪽은 방금', () => {
    expect(relativeTime('2026-07-23T14:59:30', NOW)).toBe('방금');
    expect(relativeTime('2026-07-23T15:00:00', NOW)).toBe('방금');
  });

  it('기기 시계가 앞서 미래로 찍혀도 방금으로 흡수한다', () => {
    expect(relativeTime('2026-07-23T15:10:00', NOW)).toBe('방금');
  });

  it('한 시간 안쪽은 분, 같은 날은 시간', () => {
    expect(relativeTime('2026-07-23T14:48:00', NOW)).toBe('12분 전');
    expect(relativeTime('2026-07-23T14:00:00', NOW)).toBe('1시간 전');
    expect(relativeTime('2026-07-23T09:00:00', NOW)).toBe('6시간 전');
  });

  it('자정을 넘기면 시간 단위를 쓰지 않는다 — 어제 일이 오늘로 읽히면 안 된다', () => {
    // 5시간 전이지만 날짜가 바뀌었으므로 '어제'.
    expect(relativeTime('2026-07-22T22:00:00', new Date('2026-07-23T03:00:00'))).toBe('어제');
  });

  it('그 이전은 날짜, 해가 다르면 연도까지', () => {
    expect(relativeTime('2026-07-18T10:00:00', NOW)).toBe('7월 18일');
    expect(relativeTime('2025-12-03T10:00:00', NOW)).toBe('2025년 12월 3일');
  });
});
