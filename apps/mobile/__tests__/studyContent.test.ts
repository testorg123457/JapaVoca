import { isStudyValid } from '../src/screens/onboarding/studyContent';

const base = { mode: null, level: null, hiragana: false, katakana: false } as const;

describe('isStudyValid', () => {
  it('미선택은 무효', () => {
    expect(isStudyValid({ ...base })).toBe(false);
  });
  it('레벨 트랙은 level 필요', () => {
    expect(isStudyValid({ ...base, mode: 'kanji', level: null })).toBe(false);
    expect(isStudyValid({ ...base, mode: 'kanji', level: 'N5' })).toBe(true);
    expect(isStudyValid({ ...base, mode: 'kana_word', level: 'N3' })).toBe(true);
  });
  it('가나 트랙은 히라/가타 중 하나 이상', () => {
    expect(isStudyValid({ ...base, mode: 'kana' })).toBe(false);
    expect(isStudyValid({ ...base, mode: 'kana', hiragana: true })).toBe(true);
  });
});
