import React from 'react';
import { View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import type { ChoiceCardProps, ChoiceVisual, QuizTheme } from '../../../theme/quiz/contract';
import { withAlpha } from '../../../theme/quiz/withAlpha';
import { useQuizTheme } from '../../../theme/quiz/useQuizTheme';

/** 테마 + 시각상태 → 선택지 색. 순수 함수(테스트 대상). */
export function choiceCardStyle(
  theme: QuizTheme,
  visual: ChoiceVisual,
): { bg: string; border: string; text: string; icon: string | null } {
  const c = theme.colors;
  const borderAlpha = theme.scheme === 'dark' ? 0.5 : 0.45;
  if (visual === 'correct') {
    return { bg: withAlpha(c.correct, 0.12), border: withAlpha(c.correct, borderAlpha), text: c.correct, icon: c.correct };
  }
  if (visual === 'wrong') {
    return { bg: withAlpha(c.wrong, 0.12), border: withAlpha(c.wrong, borderAlpha), text: c.wrong, icon: c.wrong };
  }
  if (visual === 'dimmed') {
    return { bg: theme.shape.choiceStyle === 'fill' ? c.bg : 'transparent', border: c.line, text: c.textTertiary, icon: null };
  }
  // default — choiceStyle별
  switch (theme.shape.choiceStyle) {
    case 'outline':
      return { bg: 'transparent', border: c.textTertiary, text: c.textPrimary, icon: null };
    case 'soft':
      return { bg: withAlpha(c.brand, 0.06), border: c.line, text: c.textPrimary, icon: null };
    case 'fill':
    default:
      return { bg: c.surface, border: c.line, text: c.textPrimary, icon: null };
  }
}

export function ChoiceCard({
  text, visual, disabled, onPress, widthPercent = '48.5%',
}: ChoiceCardProps & { widthPercent?: string }): React.JSX.Element {
  const theme = useQuizTheme();
  const s = choiceCardStyle(theme, visual);
  return (
    <PressableScale onPress={onPress} disabled={disabled} pressedScale={0.985} style={{ width: widthPercent as any }}>
      <View style={{
        // 고정 높이 대신 minHeight — 4장이 2줄 기준 같은 높이로 정렬되고(그리드 정돈),
        // 긴 선택지는 2줄까지 늘어난다.
        minHeight: 66,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: s.bg,
        borderWidth: theme.shape.borderWidth, borderColor: s.border,
        borderRadius: theme.shape.radius.choice,
      }}>
        {visual === 'correct' && s.icon && <Icon name="check" size={16} color={s.icon} strokeWidth={2.8} />}
        {visual === 'wrong' && s.icon && <Icon name="close" size={16} color={s.icon} strokeWidth={2.8} />}
        <AppText
          variant="subheading"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={{ color: s.text, fontSize: 18, lineHeight: 24, textAlign: 'center', flexShrink: 1 }}>
          {text}
        </AppText>
      </View>
    </PressableScale>
  );
}
