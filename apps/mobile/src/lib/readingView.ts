/** 발음을 화면에 적는 문자열과 TTS에 넘길 목록을 고른다.
 *
 * 호출부가 6군데(문제 상단·문제 듣기·결과 표시·결과 듣기·오답노트·구성 트리)라
 * 각자 삼항연산자를 쓰면 어긋난다. 분기는 여기 한 곳에만 둔다.
 *
 * 한자는 서버가 파싱해 준 `readings`(훈독 우선, 없으면 음독)를 쓰고,
 * 단어·가나는 `readings`가 비어 있어 `reading` 단일 문자열로 떨어진다.
 */
import type { QuizSetDetail } from '../api/quiz';

/** 표시/재생에 필요한 최소 형태. QuizSetDetail 전체를 요구하지 않는다. */
export type ReadingSource = Pick<QuizSetDetail, 'surface' | 'reading' | 'readings'> & {
  script?: QuizSetDetail['script'];
};

/** 화면에 적을 발음 한 줄. 없으면 빈 문자열(호출부가 줄 자체를 숨긴다). */
export function readingLine(detail: ReadingSource): string {
  const readings = detail.readings ?? [];
  if (readings.length > 0) {
    return readings.map((r) => r.display).join(' · ');
  }
  return detail.reading ?? '';
}

/** 듣기 버튼이 순서대로 읽을 목록. */
export function speakList(detail: ReadingSource): string[] {
  const readings = detail.readings ?? [];
  if (readings.length > 0) {
    return readings.map((r) => r.speak).filter(Boolean);
  }
  // 가나는 reading이 로마자('kya')라 ja-JP TTS에 넘기면 안 된다. 글자를 읽힌다.
  if (detail.script) {
    return detail.surface ? [detail.surface] : [];
  }
  const fallback = detail.reading || detail.surface;
  return fallback ? [fallback] : [];
}
