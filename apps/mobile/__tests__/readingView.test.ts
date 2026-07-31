import { readingLine, speakList } from '../src/lib/readingView';
import type { QuizSetDetail } from '../src/api/quiz';

/** 서버 페이로드 최소 형태. 테스트마다 필요한 필드만 덮어쓴다. */
function detail(over: Partial<QuizSetDetail>): QuizSetDetail {
  return {
    surface: '',
    reading: '',
    meaning: '',
    components: '',
    stroke_count: null,
    readings: [],
    script: null,
    ...over,
  };
}

describe('한자 — readings 사용', () => {
  const 食 = detail({
    surface: '食',
    reading: 'く（う） · た（べる）',
    readings: [
      { display: 'く（う）', speak: 'くう' },
      { display: 'た（べる）', speak: 'たべる' },
    ],
  });

  it('표시는 괄호를 남기고 · 로 잇는다', () => {
    expect(readingLine(食)).toBe('く（う） · た（べる）');
  });

  it('재생은 괄호를 뗀 speak 목록', () => {
    expect(speakList(食)).toEqual(['くう', 'たべる']);
  });

  it('훈독이 없어 음독으로 폴백된 한자도 똑같이 다룬다', () => {
    // 王 — 서버가 이미 음독으로 바꿔 보내므로 클라이언트는 구분하지 않는다
    const 王 = detail({
      surface: '王',
      readings: [{ display: 'オウ', speak: 'オウ' }],
    });
    expect(readingLine(王)).toBe('オウ');
    expect(speakList(王)).toEqual(['オウ']);
  });
});

describe('단어 — reading 사용', () => {
  // readings는 빈 배열이고 발음은 reading에 있다. 예전엔 결과 화면이
  // on_reading만 봐서 단어는 발음 줄이 통째로 안 떴다.
  const 勉強 = detail({ surface: '勉強', reading: 'べんきょう' });

  it('표시는 word.reading', () => {
    expect(readingLine(勉強)).toBe('べんきょう');
  });

  it('재생도 word.reading', () => {
    expect(speakList(勉強)).toEqual(['べんきょう']);
  });

  it('reading이 비면 표시는 빈 문자열, 재생은 표기 자체', () => {
    const noReading = detail({ surface: 'ラーメン', reading: '' });
    expect(readingLine(noReading)).toBe('');
    expect(speakList(noReading)).toEqual(['ラーメン']);
  });
});

describe('가나 — 표시는 로마자, 재생은 글자', () => {
  const きゃ = detail({ surface: 'きゃ', reading: 'kya', script: 'hira' });

  it('표시는 로마자', () => {
    expect(readingLine(きゃ)).toBe('kya');
  });

  it('재생은 글자 — 로마자를 ja-JP TTS에 넘기면 안 된다', () => {
    expect(speakList(きゃ)).toEqual(['きゃ']);
  });
});

describe('구버전 캐시 폴백', () => {
  // readings가 생기기 전 MMKV에 저장된 세트. 필드 자체가 없다.
  const 낡은한자 = { ...detail({ surface: '高', reading: 'コウ / たか-い' }) };
  delete (낡은한자 as { readings?: unknown }).readings;

  it('readings가 없으면 reading으로 떨어진다', () => {
    expect(readingLine(낡은한자)).toBe('コウ / たか-い');
    expect(speakList(낡은한자)).toEqual(['コウ / たか-い']);
  });

  it('아무것도 없으면 재생은 표기, 표시는 빈 문자열', () => {
    const 빈것 = detail({ surface: '々', reading: '' });
    expect(readingLine(빈것)).toBe('');
    expect(speakList(빈것)).toEqual(['々']);
  });

  it('표기까지 비면 재생할 게 없다', () => {
    expect(speakList(detail({ surface: '', reading: '' }))).toEqual([]);
  });
});
