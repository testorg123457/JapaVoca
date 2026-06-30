import { choiceCardStyle } from '../src/screens/quiz/components/ChoiceCard';
import classic from '../src/theme/quiz/themes/classic';
import paper from '../src/theme/quiz/themes/paper';

describe('choiceCardStyle', () => {
  it('classic default(fill)는 surface 면', () => {
    const s = choiceCardStyle(classic, 'default');
    expect(s.bg).toBe('#1E222A');
    expect(s.text).toBe('#EDEEF0');
    expect(s.icon).toBeNull();
  });
  it('correct/wrong은 base 색을 글자·아이콘에 사용', () => {
    expect(choiceCardStyle(classic, 'correct').text).toBe('#33C97A');
    expect(choiceCardStyle(classic, 'correct').icon).toBe('#33C97A');
    expect(choiceCardStyle(classic, 'wrong').text).toBe('#FF5A45');
  });
  it('correct 배경은 base + 0.12 알파', () => {
    expect(choiceCardStyle(classic, 'correct').bg).toBe('rgba(51,201,122,0.12)');
  });
  it('paper default(soft)는 brand 소프트 틴트', () => {
    const s = choiceCardStyle(paper, 'default');
    expect(s.bg).toBe('rgba(31,150,96,0.06)');
    expect(s.text).toBe('#1A1A1A');
  });
});
