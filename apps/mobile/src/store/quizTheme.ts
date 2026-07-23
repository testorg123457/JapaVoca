/**
 * 잠금화면 퀴즈 테마 선택 영속 store — MMKV.
 * 앱 전역 light/dark(store/theme.ts)와 독립된 별도 축.
 */
import { createMMKV } from 'react-native-mmkv';
import { resolveThemeId } from '../theme/quiz/themes';

const storage = createMMKV({ id: 'quizTheme' });
const ID_KEY = 'quizTheme.id';

export function getQuizThemeId(): string {
  return resolveThemeId(storage.getString(ID_KEY));
}

export function setQuizThemeId(id: string): void {
  storage.set(ID_KEY, id);
}

// ── 커스텀 테마 배경 사진 ────────────────────────────────────────────────────────

const PHOTO_KEY = 'quizTheme.photoUri';

/** 커스텀 테마 배경 사진 경로. 고른 적 없으면 undefined. */
export function getQuizPhotoUri(): string | undefined {
  return storage.getString(PHOTO_KEY) || undefined;
}

export function setQuizPhotoUri(uri: string): void {
  storage.set(PHOTO_KEY, uri);
}

export function clearQuizPhotoUri(): void {
  storage.remove(PHOTO_KEY);
}
