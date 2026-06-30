import { withAlpha } from '../src/theme/quiz/withAlpha';

describe('withAlpha', () => {
  it('#RRGGBB + alpha → rgba', () => {
    expect(withAlpha('#33C97A', 0.12)).toBe('rgba(51,201,122,0.12)');
    expect(withAlpha('#FFFFFF', 0.1)).toBe('rgba(255,255,255,0.1)');
  });
  it('# 없이도 동작', () => {
    expect(withAlpha('000000', 1)).toBe('rgba(0,0,0,1)');
  });
  it('잘못된 hex는 입력을 그대로 반환', () => {
    expect(withAlpha('rgba(1,2,3,0.5)', 0.2)).toBe('rgba(1,2,3,0.5)');
  });
});
