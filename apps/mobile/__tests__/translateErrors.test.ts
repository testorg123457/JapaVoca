import { classifyTranslateError, errorMessage } from '../src/lib/translate/errors';

describe('classifyTranslateError', () => {
  it('permission-blocked → permission', () => {
    expect(classifyTranslateError(new Error('permission-blocked'))).toBe('permission');
  });
  it('no-text → no-text', () => {
    expect(classifyTranslateError(new Error('no-text'))).toBe('no-text');
  });
  it('axios 5xx → server', () => {
    expect(classifyTranslateError({ response: { status: 502 } })).toBe('server');
  });
  it('그 외 → unknown', () => {
    expect(classifyTranslateError(new Error('boom'))).toBe('unknown');
  });
});

describe('errorMessage', () => {
  it('no-text는 다시 찍기 안내, 사과 없음', () => {
    const m = errorMessage('no-text');
    expect(m.message).toContain('다시');
    expect(m.message).not.toMatch(/죄송|미안/);
  });
});
