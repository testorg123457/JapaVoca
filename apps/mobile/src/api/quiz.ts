/**
 * 퀴즈 API — 출제/채점.
 *
 * 백엔드 실제 계약(apps/server learning/services.py · serializers.py 직접 확인):
 *   GET  /api/quiz/next/?mode=word|kanji
 *     → { question_token, mode, item_type, question_type, prompt, reading,
 *         jlpt_level, choices: [{index, text}] }
 *     출제할 항목이 없으면 409(NoContent).
 *   POST /api/quiz/answer/  { question_token, choice_index, answer_ms? }
 *     → { is_correct, correct_index, srs, box_id, box_grade }
 *
 * ⚠️ 선택지는 id가 아니라 0-based index로 식별한다. 정답 텍스트는 응답에
 * 오지 않으므로, 오답 표시는 클라가 가진 choices[correct_index].text 로 한다.
 */
import apiClient from './client';

export type QuizMode = 'word' | 'kanji';
export type QuestionType = 'word_to_meaning' | 'meaning_to_word';
export type BoxGrade = 'normal' | 'rare' | 'jackpot';

export type QuizChoice = { index: number; text: string };

export type QuizQuestion = {
  question_token: string;
  mode: QuizMode;
  item_type: QuizMode;
  question_type: QuestionType;
  prompt: string;
  /** 읽기(히라가나/음·훈독). word_to_meaning 일 때만 채워짐. 없으면 빈 문자열. */
  reading: string;
  /** JLPT 급수(N5~N1). 미태깅이면 빈 문자열. */
  jlpt_level: string;
  choices: QuizChoice[];
};

export type QuizAnswerResult = {
  is_correct: boolean;
  correct_index: number;
  srs: {
    repetitions: number;
    interval_days: number;
    ease: number;
    due_at: string;
  };
  /** 정답으로 새로 생성된 상자 id. 오답이거나 일일 상한 도달 시 null. */
  box_id: number | null;
  box_grade: BoxGrade | null;
};

export async function getNextQuiz(mode: QuizMode = 'word'): Promise<QuizQuestion> {
  const response = await apiClient.get<QuizQuestion>('/api/quiz/next/', {
    params: { mode },
  });
  return response.data;
}

export type SubmitAnswerParams = {
  question_token: string;
  choice_index: number;
  answer_ms: number;
};

export async function submitAnswer(
  params: SubmitAnswerParams,
): Promise<QuizAnswerResult> {
  const response = await apiClient.post<QuizAnswerResult>('/api/quiz/answer/', params);
  return response.data;
}
