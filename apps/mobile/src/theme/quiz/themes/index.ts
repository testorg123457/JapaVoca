import type { QuizTheme } from '../contract';
import classic from './classic';
import forest from './forest';
import olive from './olive';
import dracula from './dracula';
import sage from './sage';
import pink from './pink';

/** 새 테마 추가 = 위에 import 1줄 + 아래 배열에 1개 추가. */
const ALL: QuizTheme[] = [classic, forest, olive, dracula, sage, pink];

export const DEFAULT_THEME_ID = 'classic';

export const themeList: QuizTheme[] = ALL;
export const themesById: Record<string, QuizTheme> = Object.fromEntries(
  ALL.map((t) => [t.id, t]),
);

/** id로 테마를 찾되, 없으면 기본 테마. */
export function getTheme(id: string): QuizTheme {
  return themesById[id] ?? themesById[DEFAULT_THEME_ID];
}

/** 저장값(또는 undefined)을 유효한 테마 id로 정규화. */
export function resolveThemeId(raw: string | undefined): string {
  return raw && themesById[raw] ? raw : DEFAULT_THEME_ID;
}
