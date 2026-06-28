/**
 * 퀴즈 세트 로컬 캐시 — MMKV 기반.
 *
 * - activeSet: 현재 세트 전체(문제·정답키·해설 포함). 오프라인 즉시 채점에 사용.
 * - cursor: 현재 풀이 중인 문항 인덱스 (0-based).
 * - pendingAnswers: 오프라인에서 푼 답안 큐. 온라인 복귀 시 /quiz/sync/ 로 flush.
 */
import { createMMKV } from 'react-native-mmkv';
import type { QuizSetResponse, SyncItem } from '../api/quiz';

const storage = createMMKV({ id: 'quiz' });

const SET_KEY = 'quiz.activeSet';
const CURSOR_KEY = 'quiz.cursor';
const PENDING_KEY = 'quiz.pendingAnswers';

export type PendingAnswer = SyncItem & { answered_at: string };

// ── 세트 캐시 ────────────────────────────────────────────────────────────────────

export function getCachedSet(): QuizSetResponse | null {
  const raw = storage.getString(SET_KEY);
  if (!raw) { return null; }
  try { return JSON.parse(raw) as QuizSetResponse; } catch { return null; }
}

export function setCachedSet(set: QuizSetResponse): void {
  storage.set(SET_KEY, JSON.stringify(set));
}

export function clearCachedSet(): void {
  storage.remove(SET_KEY);
  storage.remove(CURSOR_KEY);
}

// ── 진행 커서 ────────────────────────────────────────────────────────────────────

export function getCursor(): number {
  return storage.getNumber(CURSOR_KEY) ?? 0;
}

export function setCursor(index: number): void {
  storage.set(CURSOR_KEY, index);
}

// ── 오프라인 pending 큐 ──────────────────────────────────────────────────────────

export function getPendingAnswers(): PendingAnswer[] {
  const raw = storage.getString(PENDING_KEY);
  if (!raw) { return []; }
  try { return JSON.parse(raw) as PendingAnswer[]; } catch { return []; }
}

export function addPendingAnswer(answer: PendingAnswer): void {
  const current = getPendingAnswers();
  storage.set(PENDING_KEY, JSON.stringify([...current, answer]));
}

export function clearPendingAnswers(): void {
  storage.remove(PENDING_KEY);
}
