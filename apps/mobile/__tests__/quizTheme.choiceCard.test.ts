import { choiceCardStyle } from '../src/screens/quiz/components/ChoiceCard';
import classic from '../src/theme/quiz/themes/classic';
import pink from '../src/theme/quiz/themes/pink';

describe('choiceCardStyle', () => {
  it('classic default(fill)는 surface 면', () => {
    const s = choiceCardStyle(classic, 'default');
    expect(s.bg).toBe('#2A3040');
    expect(s.text).toBe('#E9ECF2');
    expect(s.icon).toBeNull();
  });
  it('correct/wrong은 base 색을 글자·아이콘에 사용', () => {
    expect(choiceCardStyle(classic, 'correct').text).toBe('#46D08A');
    expect(choiceCardStyle(classic, 'correct').icon).toBe('#46D08A');
    expect(choiceCardStyle(classic, 'wrong').text).toBe('#FF6B6B');
  });
  it('correct 배경은 base + 0.12 알파', () => {
    expect(choiceCardStyle(classic, 'correct').bg).toBe('rgba(70,208,138,0.12)');
  });
  it('pink default(fill)는 surface 면 — 사진 배경 위 가독성 위해 불투명', () => {
    const s = choiceCardStyle(pink, 'default');
    expect(s.bg).toBe('#FFFFFF');
    expect(s.text).toBe('#3A2129');
  });
});
