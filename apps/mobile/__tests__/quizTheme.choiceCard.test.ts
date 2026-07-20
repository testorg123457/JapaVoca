import { choiceCardStyle } from '../src/screens/quiz/components/ChoiceCard';
import classic from '../src/theme/quiz/themes/classic';
import sage from '../src/theme/quiz/themes/sage';

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
  it('classic default(fill)는 테두리 없음(대비 충분)', () => {
    expect(choiceCardStyle(classic, 'default').border).toBe('transparent');
  });
  it('sage(choiceOutline)는 기본 선택지에도 line 테두리를 그린다', () => {
    const s = choiceCardStyle(sage, 'default');
    expect(s.bg).toBe('#242726');
    expect(s.border).toBe('#48514C');
  });
});
