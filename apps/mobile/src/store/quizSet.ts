/**
 * 퀴즈 세트 로컬 캐시 — MMKV 기반.
 *
 * - activeSet: 현재 세트 전체(문제·정답키·해설 포함). 오프라인 즉시 채점에 사용.
 * - cursor: 현재 풀이 중인 문항 인덱스 (0-based).
 * - pendingAnswers: 오프라인에서 푼 답안 큐. 온라인 복귀 시 /quiz/sync/ 로 flush.
 * - componentTree: 한자별 구성 트리 캐시. 오프라인에서 구성 자세히 보기에 사용.
 */
import { createMMKV } from 'react-native-mmkv';
import type { QuizSetQuestion, QuizSetResponse, SyncItem } from '../api/quiz';
import type { ComponentTreeResponse } from '../api/content';

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

/**
 * 답을 제출한 직후 호출 — 캐시된 세트의 해당 문항을 answered로 찍고 커서를 다음으로 옮긴다.
 *
 * ⚠️ 커서를 '다음' 버튼에서만 올리면, 결과 화면에서 앱을 나갔다 돌아왔을 때 이미 답한
 *    문항을 다시 보여주게 된다. 그 문항을 다시 제출하면 서버가 '이미 채점됨'으로 막아
 *    정답/오답 표시 없이 넘어가 버린다. 그래서 제출 시점에 진행 상태를 확정한다.
 */
export function markAnswered(index: number): void {
  const set = getCachedSet();
  if (set?.questions[index]) {
    set.questions[index] = { ...set.questions[index], answered: true };
    setCachedSet(set);
  }
  if (index + 1 > getCursor()) {
    setCursor(index + 1);
  }
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

/**
 * 전송에 성공한 답안만 큐에서 뺀다.
 *
 * ⚠️ 큐를 통째로 비우면 안 된다. 전송이 오가는 동안 사용자가 새로 푼 답이 큐에 쌓일 수
 *    있는데, 그걸 보내지도 않고 같이 지워버리면 답이 조용히 사라진다.
 */
export function removePendingAnswers(tokens: string[]): void {
  const sent = new Set(tokens);
  const remaining = getPendingAnswers().filter(a => !sent.has(a.question_token));
  if (remaining.length) {
    storage.set(PENDING_KEY, JSON.stringify(remaining));
  } else {
    storage.remove(PENDING_KEY);
  }
}

// ── 복습 데이터 ──────────────────────────────────────────────────────────────────

const REVIEW_KEY = 'quiz.lastReview';

export type ReviewEntry = {
  question: QuizSetQuestion;
  selectedIndex: number;
  isCorrect: boolean;
};

export type ReviewData = {
  setId: number;
  completedAt: string; // ISO
  entries: ReviewEntry[];
};

export function getLastReview(): ReviewData | null {
  const raw = storage.getString(REVIEW_KEY);
  if (!raw) { return null; }
  try { return JSON.parse(raw) as ReviewData; } catch { return null; }
}

export function setLastReview(data: ReviewData): void {
  storage.set(REVIEW_KEY, JSON.stringify(data));
}

export function clearLastReview(): void {
  storage.remove(REVIEW_KEY);
}

// ── 구성 트리 캐시 ───────────────────────────────────────────────────────────────

const COMPONENT_PREFIX = 'quiz.component.';

export function getCachedComponentTree(character: string): ComponentTreeResponse | null {
  const raw = storage.getString(COMPONENT_PREFIX + character);
  if (!raw) { return null; }
  try { return JSON.parse(raw) as ComponentTreeResponse; } catch { return null; }
}

export function setCachedComponentTree(character: string, data: ComponentTreeResponse): void {
  storage.set(COMPONENT_PREFIX + character, JSON.stringify(data));
}
