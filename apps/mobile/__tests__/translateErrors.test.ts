import { classifyTranslateError, errorMessage } from '../src/lib/translate/errors';

describe('classifyTranslateError', () => {
  it('permission-blocked → permission-blocked', () => {
    expect(classifyTranslateError(new Error('permission-blocked'))).toBe('permission-blocked');
  });
  it('permission-denied → permission-denied', () => {
    expect(classifyTranslateError(new Error('permission-denied'))).toBe('permission-denied');
  });
  it('no-text → no-text', () => {
    expect(classifyTranslateError(new Error('no-text'))).toBe('no-text');
  });
  it('axios 5xx → server', () => {
    expect(classifyTranslateError({ response: { status: 502 } })).toBe('server');
  });
  it('axios 400 → too-large (재시도로 안 풀림)', () => {
    expect(classifyTranslateError({ response: { status: 400 } })).toBe('too-large');
  });
  it('unreadable-image → unreadable-image', () => {
    expect(classifyTranslateError(new Error('unreadable-image'))).toBe('unreadable-image');
  });
  it('그 외 → unknown', () => {
    expect(classifyTranslateError(new Error('boom'))).toBe('unknown');
  });
});

describe('errorMessage', () => {
  it('denied는 설정 안내 없이 허용만 안내', () => {
    expect(errorMessage('permission-denied').message).not.toContain('설정');
  });
  it('blocked는 설정에서 켜라고 안내', () => {
    expect(errorMessage('permission-blocked').message).toContain('설정');
  });
  it('no-text는 다시 찍기 안내, 사과 없음', () => {
    const m = errorMessage('no-text');
    expect(m.message).toContain('다시');
    expect(m.message).not.toMatch(/죄송|미안/);
  });
});
