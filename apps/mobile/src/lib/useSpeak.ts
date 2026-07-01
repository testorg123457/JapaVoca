import { useCallback, useEffect, useRef, useState } from 'react';
import Tts from 'react-native-tts';

// 앱 기동 1회 — ja-JP
Tts.setDefaultLanguage('ja-JP');

/** '・'로 구분된 복수 발음을 순차 재생. 토글/취소/언마운트 정리 포함. */
export function useSpeak(text: string) {
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef(false);
  const subRef = useRef<{ remove: () => void } | null>(null);

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
    const readings = text.split('・').map(r => r.trim()).filter(Boolean);
    if (readings.length === 0) { return; }
    cancelRef.current = false;
    setSpeaking(true);
    const playNext = (i: number) => {
      if (cancelRef.current || i >= readings.length) { setSpeaking(false); return; }
      Tts.speak(readings[i]);
      let sub: { remove: () => void } | null = null;
      const onFinish = () => {
        sub?.remove();
        subRef.current = null;
        if (i + 1 < readings.length) { setTimeout(() => playNext(i + 1), 600); }
        else { setSpeaking(false); }
      };
      sub = Tts.addEventListener('tts-finish', onFinish) as unknown as { remove: () => void };
      subRef.current = sub;
    };
    playNext(0);
  }, [text, speaking]);

  return { speaking, toggle };
}
