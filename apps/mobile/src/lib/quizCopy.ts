/**
 * 퀴즈 표시 문구 — 유형 라벨 + 지시문.
 * 잠금화면/인앱 퀴즈가 공유한다(서버 item_type·question_type 조합으로 결정).
 */
import type { QuizItemType, QuestionType } from '../api/quiz';

/** 카드 좌상단 유형 라벨: 한자 / 단어 / 가나. */
export function quizTypeLabel(itemType: QuizItemType): string {
  switch (itemType) {
    case 'kanji':
      return '한자';
    case 'kana':
      return '가나';
    case 'word':
    default:
      return '단어';
  }
}

/** 문제 지시문. 유형 + 출제 방향(question_type)으로 생성. */
export function quizInstruction(itemType: QuizItemType, questionType: QuestionType): string {
  if (itemType === 'kana') {
    // 가나는 글자→로마자 방향 고정.
    return '다음 글자의 로마자 표기는?';
  }
  const noun = itemType === 'kanji' ? '한자' : '단어';
  return questionType === 'word_to_meaning'
    ? `다음 ${noun}의 뜻으로 옳은 것은?`
    : `다음 뜻에 해당하는 ${noun}는?`;
}
