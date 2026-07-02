/**
 * 퀴즈 API — 단발 출제 / 세트 출제 / 채점 / 동기화.
 *
 * GET  /api/quiz/set/
 *   → QuizSetResponse. 쿨다운 중이면 questions:[], cooldown_until: ISO string.
 * POST /api/quiz/answer/  { question_token, choice_index, answer_ms? }
 *   → QuizAnswerResult
 * POST /api/quiz/sync/    [{question_token, choice_index, answer_ms?, answered_at?}]
 *   → [{status:'ok'|'invalid'|'already_graded', is_correct?}]
 * POST /api/quiz/bookmarks/ / DELETE /api/quiz/bookmarks/
 *   → {is_bookmarked: boolean}
 */
import apiClient from './client';

export type QuizItemType = 'word' | 'kanji' | 'kana';
export type QuestionType = 'word_to_meaning' | 'meaning_to_word';
export type BoxGrade = 'normal' | 'purple';
export type QuizChoice = { index: number; text: string };

// ── 단발 출제 (기존 /next/ 경로, 잠금화면 Phase B 등) ────────────────────────────

export type QuizQuestion = {
  question_token: string;
  mode: QuizItemType;
  item_type: QuizItemType;
  question_type: QuestionType;
  prompt: string;
  reading: string;
  jlpt_level: string;
  choices: QuizChoice[];
};

export async function getNextQuiz(): Promise<QuizQuestion> {
  const response = await apiClient.get<QuizQuestion>('/api/quiz/next/');
  return response.data;
}

// ── 세트 출제 ────────────────────────────────────────────────────────────────────

export type KanaExampleWord = {
  surface: string;
  /** 한자 표기. 없으면 빈 문자열 */
  kanji: string;
  meaning: string;
};

export type QuizSetDetail = {
  surface: string;
  reading: string;
  meaning: string;
  components: string;
  stroke_count: number | null;
  on_reading: string;
  kun_reading: string;
  /** 가나일 때 'hira'|'kata', 그 외 null */
  script: 'hira' | 'kata' | null;
  /** 가나 퀴즈 전용 — 랜덤 풀에서 선택된 예시 단어 최대 2개 */
  example_words?: KanaExampleWord[];
};

export type QuizSetQuestion = {
  order: number;
  question_token: string;
  item_type: QuizItemType;
  item_id: number;
  /** item_type='word'일 때: 'kanji'|'kana'. 그 외 null */
  word_type: 'kanji' | 'kana' | null;
  question_type: QuestionType;
  prompt: string;
  reading: string;
  jlpt_level: string;
  choices: QuizChoice[];
  /** 오프라인 채점용 정답 인덱스 */
  answer_index: number;
  detail: QuizSetDetail;
  answered: boolean;
};

export type QuizSetResponse = {
  set_id: number;
  /** 쿨다운 중이면 ISO 시각 문자열, 풀 수 있으면 null */
  cooldown_until: string | null;
  /** 쿨다운 중이면 빈 배열 */
  questions: QuizSetQuestion[];
};

export async function getQuizSet(): Promise<QuizSetResponse> {
  const response = await apiClient.get<QuizSetResponse>('/api/quiz/set/');
  return response.data;
}

// ── 채점 ─────────────────────────────────────────────────────────────────────────

export type QuizAnswerResult = {
  is_correct: boolean;
  correct_index: number;
  srs: {
    repetitions: number;
    interval_days: number;
    ease: number;
    due_at: string;
  };
  box_id: number | null;
  box_grade: BoxGrade | null;
  /** 세트 토큰일 때 세트 누적 상자 수, 단발 토큰이면 null */
  set_boxes_earned: number | null;
  /** 세트 토큰일 때 세트 완료 여부, 단발 토큰이면 null */
  set_completed: boolean | null;
};

export type SubmitAnswerParams = {
  question_token: string;
  choice_index: number;
  answer_ms: number;
};

export async function submitAnswer(params: SubmitAnswerParams): Promise<QuizAnswerResult> {
  const response = await apiClient.post<QuizAnswerResult>('/api/quiz/answer/', params);
  return response.data;
}

// ── 오프라인 동기화 ──────────────────────────────────────────────────────────────

export type SyncItem = {
  question_token: string;
  choice_index: number;
  answer_ms?: number;
  answered_at?: string;
};

export type SyncResult = {
  status: 'ok' | 'invalid' | 'already_graded';
  is_correct?: boolean;
};

export async function syncAnswers(items: SyncItem[]): Promise<SyncResult[]> {
  const response = await apiClient.post<SyncResult[]>('/api/quiz/sync/', items);
  return response.data;
}

// ── 북마크 ────────────────────────────────────────────────────────────────────────

export type BookmarkItem = {
  item_type: QuizItemType;
  item_id: number;
  surface: string;
  reading: string;
  meaning: string;
  jlpt_level: string;
};

export async function getBookmarks(): Promise<BookmarkItem[]> {
  const response = await apiClient.get<BookmarkItem[]>('/api/quiz/bookmarks/');
  return response.data;
}

export async function toggleBookmark(
  item_type: QuizItemType,
  item_id: number,
  bookmarked: boolean,
): Promise<void> {
  if (bookmarked) {
    await apiClient.post('/api/quiz/bookmarks/', { item_type, item_id });
  } else {
    await apiClient.delete('/api/quiz/bookmarks/', { data: { item_type, item_id } });
  }
}
