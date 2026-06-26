/** 학습 선택 모델 + 순수 검증(네이티브/React 의존 없음). */
export type StudyMode = 'kanji' | 'kanji_word' | 'kana_word' | 'kana';
export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type StudySelection = {
  mode: StudyMode | null;
  level: JlptLevel | null;
  hiragana: boolean;
  katakana: boolean;
};

export function isStudyValid(s: StudySelection): boolean {
  if (s.mode === 'kana') {
    return s.hiragana || s.katakana;
  }
  if (s.mode === 'kanji' || s.mode === 'kanji_word' || s.mode === 'kana_word') {
    return s.level != null;
  }
  return false;
}

/** N5(쉬움)→N1(어려움). difficulty 는 난이도 막대(1~5)용. */
export const LEVELS: { code: JlptLevel; name: string; difficulty: number }[] = [
  { code: 'N5', name: '입문', difficulty: 1 },
  { code: 'N4', name: '초급', difficulty: 2 },
  { code: 'N3', name: '중급', difficulty: 3 },
  { code: 'N2', name: '중상급', difficulty: 4 },
  { code: 'N1', name: '고급', difficulty: 5 },
];

/** 종류 탭. 가나(글자) 보상 퀴즈는 후속 플랜이라 비활성. */
export const TABS: { mode: StudyMode; label: string; disabled?: boolean }[] = [
  { mode: 'kanji', label: '한자' },
  { mode: 'kanji_word', label: '한자단어' },
  { mode: 'kana_word', label: '가나단어' },
  { mode: 'kana', label: '가나', disabled: true },
];
