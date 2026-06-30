import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Tts from 'react-native-tts';

import { AppText } from '../../../components/AppText';
import { Icon } from '../../../components/Icon';
import { withAlpha } from '../../../theme/quiz/withAlpha';
import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';

// 앱 기동 1회 — ja-JP
Tts.setDefaultLanguage('ja-JP');

export function AudioButton({ text }: { text: string }): React.JSX.Element {
  const theme = useQuizTheme();
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef(false);
  const subRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => () => {
    cancelRef.current = true;
    subRef.current?.remove();
    subRef.current = null;
    Tts.stop();
  }, []);

  const handlePress = useCallback(() => {
    if (speaking) {
      cancelRef.current = true;
      subRef.current?.remove();
      subRef.current = null;
      Tts.stop();
      setSpeaking(false);
      return;
    }
    const readings = text.split('・').map((r) => r.trim()).filter(Boolean);
    if (readings.length === 0) { return; }
    cancelRef.current = false;
    setSpeaking(true);
    const playNext = (index: number) => {
      if (cancelRef.current || index >= readings.length) { setSpeaking(false); return; }
      Tts.speak(readings[index]);
      let sub: { remove: () => void } | null = null;
      const onFinish = () => {
        sub?.remove();
        subRef.current = null;
        if (index + 1 < readings.length) { setTimeout(() => playNext(index + 1), 600); }
        else { setSpeaking(false); }
      };
      sub = Tts.addEventListener('tts-finish', onFinish) as unknown as { remove: () => void };
      subRef.current = sub;
    };
    playNext(0);
  }, [text, speaking]);

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: speaking ? withAlpha(theme.colors.brandSoft, 0.13) : withAlpha(theme.colors.textPrimary, 0.05),
        borderRadius: 20,
        borderWidth: 1,
        borderColor: speaking ? theme.colors.brandSoft : theme.colors.line,
      }}
      onPress={handlePress}>
      <Icon name="volume" size={14} color={theme.colors.brandSoft} strokeWidth={2} />
      <AppText variant="caption" style={{ color: theme.colors.brandSoft }}>
        {speaking ? '■' : '듣기'}
      </AppText>
    </TouchableOpacity>
  );
}
