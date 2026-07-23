/**
 * 목록을 날짜별 섹션으로 묶는다 — 캐시 내역·알림 등 시간순 목록 공용.
 *
 * 섹션 헤더가 날짜를 담당하므로 각 행은 시간(HH:mm)만 보여주면 된다.
 * 날짜를 행마다 반복해 찍으면 같은 글자가 계속 눈에 들어와 목록이 빽빽해 보인다.
 *
 * ⚠️ 순수함수 — 테스트 있음(`__tests__/dateSections.test.ts`).
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "15:04" — 날짜는 섹션 헤더가 담당하므로 시간만. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "오늘" / "어제" / "7월 18일 (금)" / 해가 다르면 "2025.12월 3일 (수)". */
export function sectionTitle(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateKey(d) === dateKey(now)) { return '오늘'; }
  if (dateKey(d) === dateKey(yesterday)) { return '어제'; }
  const yearPrefix = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}.` : '';
  return `${yearPrefix}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export type DateSection<T> = { title: string; data: T[] };

/**
 * 인접한 같은 날짜끼리 섹션으로 묶는다(서버가 최신순 정렬을 보장한다는 전제).
 * 정렬을 다시 하지 않으므로 목록 순서는 그대로 유지된다.
 */
export function groupByDate<T>(
  items: T[],
  getIso: (item: T) => string,
  now: Date = new Date(),
): DateSection<T>[] {
  const sections: DateSection<T>[] = [];
  for (const item of items) {
    const title = sectionTitle(getIso(item), now);
    const current = sections[sections.length - 1];
    if (current?.title === title) {
      current.data.push(item);
    } else {
      sections.push({ title, data: [item] });
    }
  }
  return sections;
}
