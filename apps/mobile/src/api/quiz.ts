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
export type BoxGrade = 'normal' | 'purple' | 'burgundy';
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

export type WordExampleSentence = {
  /** 한자 표기 일본어 문장 */
  origin: string;
  /** 전부 가나로 풀어쓴 읽기 */
  reading: string;
  /** 한국어 번역 */
  translation: string;
};

/** 발음 하나. 표시용과 재생용이 다르다 — 서버 `content/readings.py` 참고.
 *  display 'た（べる）' = 괄호는 오쿠리가나(한자 몫이 아닌 딸린 히라가나)
 *  speak   'たべる'     = 괄호를 떼고 붙인 실제 단어. TTS엔 이쪽을 넘긴다 */
export type Reading = {
  display: string;
  speak: string;
};

export type QuizSetDetail = {
  surface: string;
  reading: string;
  meaning: string;
  components: string;
  stroke_count: number | null;
  /** 한자 전용(훈독 우선, 없으면 음독) 최대 3개. 단어·가나는 빈 배열.
   *  ⚠️ optional — 이 필드가 생기기 전 MMKV에 캐시된 세트엔 없다 */
  readings?: Reading[];
  /** 가나일 때 'hira'|'kata', 그 외 null */
  script: 'hira' | 'kata' | null;
  /** 가나 퀴즈 전용 — 랜덤 풀에서 선택된 예시 단어 최대 2개 */
  example_words?: KanaExampleWord[];
  /** 가나 단어 전용 — 예문 최대 3개 */
  examples?: WordExampleSentence[];
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
  // 재시도 안 한다 — 실패하면 곧바로 캐시된 세트로 오프라인 진행하는 게 낫다.
  // (잠금화면 퀴즈는 오프라인이 정상 사용 시나리오라 매번 몇 초씩 기다리면 안 된다)
  const response = await apiClient.get<QuizSetResponse>('/api/quiz/set/', {
    skipNetworkRetry: true,
  });
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
  /** 이번 정답으로 당일 정답 10문제 단위를 채웠으면 지급된 캐시 금액, 아니면 null.
   *  ⚠️ 이 필드를 안 주는 서버 응답도 있어 undefined 가능 → 반드시 typeof 로 검사할 것
   *  (`!== null` 검사는 undefined 가 통과해 오답에도 보상 토스트가 뜬다). */
  milestone_bonus?: number | null;
  /** 당일 정답 누적 수(이번 정답 포함). 위 필드를 안 주는 서버에선 undefined. */
  today_correct_count?: number;
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

// 동기화는 세트 조회 앞에서 기다리게 되므로 상한을 짧게 둔다.
// ⚠️ 길면 잠금화면 진입이 그만큼 로딩에 머문다(오프라인 즉시 진행이 이 화면의 핵심).
//    실패해도 큐는 그대로 남아 다음 기회에 재시도되므로 손실은 없다.
const SYNC_TIMEOUT_MS = 3000;

export async function syncAnswers(items: SyncItem[]): Promise<SyncResult[]> {
  const response = await apiClient.post<SyncResult[]>('/api/quiz/sync/', items, {
    timeout: SYNC_TIMEOUT_MS,
  });
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
