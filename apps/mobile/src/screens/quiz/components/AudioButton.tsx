import React from 'react';
import { TouchableOpacity } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Icon } from '../../../components/Icon';
import { withAlpha } from '../../../theme/quiz/withAlpha';
import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';
import { useSpeak } from '../../../lib/useSpeak';

/** readings: 순서대로 읽을 발음 목록. `lib/readingView.speakList()`로 만든다. */
export function AudioButton({ readings }: { readings: string[] }): React.JSX.Element {
  const theme = useQuizTheme();
  const { speaking, toggle } = useSpeak(readings);

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 13, paddingVertical: 7,
        backgroundColor: speaking
          ? withAlpha(theme.colors.brandSoft, 0.18)
          : withAlpha(theme.colors.textPrimary, 0.07),
        borderRadius: 20,
      }}
      onPress={toggle}>
      <Icon name="volume" size={14} color={theme.colors.brandSoft} strokeWidth={2} />
      <AppText variant="caption" style={{ color: theme.colors.brandSoft, fontWeight: '700' }}>
        {speaking ? '■' : '듣기'}
      </AppText>
    </TouchableOpacity>
  );
}
