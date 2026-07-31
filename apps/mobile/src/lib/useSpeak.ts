import { useCallback, useEffect, useRef, useState } from 'react';
import Tts from 'react-native-tts';

// 앱 기동 1회 — ja-JP
Tts.setDefaultLanguage('ja-JP');

/** 복수 발음을 순차 재생. 토글/취소/언마운트 정리 포함.
 *
 * ⚠️ 문자열을 받아 직접 쪼개지 않는다. 예전엔 '・'(U+30FB)로 split 했는데
 * 서버는 ' · '(U+00B7)로 합쳐서, 복수 발음이 한 번도 갈라지지 않았다.
 * 구분자 지식은 서버 `content/readings.py`에만 둔다 — 여기선 이미 쪼개진 걸 받는다.
 * 목록은 `lib/readingView.speakList()`로 만든다.
 */
export function useSpeak(readings: string[]) {
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef(false);
  const subRef = useRef<{ remove: () => void } | null>(null);

  // 배열은 렌더마다 새 참조라 의존성에 넣으면 toggle이 매번 새로 만들어진다.
  // ref로 최신 값을 읽으면 toggle 신원을 유지하면서 항상 최신 목록을 재생한다.
  const listRef = useRef(readings);
  listRef.current = readings;

  useEffect(() => () => {
    cancelRef.current = true;
    subRef.current?.remove();
    subRef.current = null;
    Tts.stop();
  }, []);

  const toggle = useCallback(() => {
    if (speaking) {
      cancelRef.current = true;
      subRef.current?.remove();
      subRef.current = null;
      Tts.stop();
      setSpeaking(false);
      return;
    }
    const list = listRef.current.map(r => r.trim()).filter(Boolean);
    if (list.length === 0) { return; }
    cancelRef.current = false;
    setSpeaking(true);
    const playNext = (i: number) => {
      if (cancelRef.current || i >= list.length) { setSpeaking(false); return; }
      Tts.speak(list[i]);
      let sub: { remove: () => void } | null = null;
      const onFinish = () => {
        sub?.remove();
        subRef.current = null;
        if (i + 1 < list.length) { setTimeout(() => playNext(i + 1), 600); }
        else { setSpeaking(false); }
      };
      sub = Tts.addEventListener('tts-finish', onFinish) as unknown as { remove: () => void };
      subRef.current = sub;
    };
    playNext(0);
  }, [speaking]);

  return { speaking, toggle };
}
