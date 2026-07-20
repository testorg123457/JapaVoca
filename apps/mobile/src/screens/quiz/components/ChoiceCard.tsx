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
    // 정답 공개 후 안 고른 선택지 — 배경으로 가라앉히고 테두리 없앰.
    return { bg: theme.shape.choiceStyle === 'fill' ? withAlpha(c.surface, 0.4) : 'transparent', border: 'transparent', text: c.textTertiary, icon: null };
  }
  // default — choiceStyle별. 기본 상태는 테두리 없이 면(surface)만으로 부드럽게.
  switch (theme.shape.choiceStyle) {
    case 'outline':
      return { bg: 'transparent', border: c.textTertiary, text: c.textPrimary, icon: null };
    case 'soft':
      return { bg: withAlpha(c.brand, 0.06), border: 'transparent', text: c.textPrimary, icon: null };
    case 'fill':
    default:
      return { bg: c.surface, border: 'transparent', text: c.textPrimary, icon: null };
  }
}

export function ChoiceCard({
  text, visual, disabled, onPress, widthPercent = '48.5%',
}: ChoiceCardProps & { widthPercent?: string }): React.JSX.Element {
  const theme = useQuizTheme();
  const s = choiceCardStyle(theme, visual);
  // 글자 수 적응형 — 한자 1자는 크게, 여러 자·한글 뜻은 버튼 폭에 맞춰 작게.
  // (adjustsFontSizeToFit이 극단 케이스 안전망)
  const len = [...text].length;
  const fontSize = len <= 1 ? 30 : len <= 2 ? 26 : len <= 4 ? 22 : len <= 7 ? 19 : 17;
  return (
    <PressableScale onPress={onPress} disabled={disabled} pressedScale={0.985} style={{ width: widthPercent as any }}>
      <View style={{
        // 고정 높이 대신 minHeight — 4장이 2줄 기준 같은 높이로 정렬되고(그리드 정돈),
        // 긴 선택지는 2줄까지 늘어난다. 한 글자 크게 수용하도록 넉넉히.
        minHeight: 88,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: s.bg,
        borderWidth: theme.shape.borderWidth, borderColor: s.border,
        borderRadius: theme.shape.radius.choice,
      }}>
        {visual === 'correct' && s.icon && <Icon name="check" size={18} color={s.icon} strokeWidth={2.8} />}
        {visual === 'wrong' && s.icon && <Icon name="close" size={18} color={s.icon} strokeWidth={2.8} />}
        <AppText
          variant="subheading"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ color: s.text, fontSize, lineHeight: fontSize * 1.2, textAlign: 'center', flexShrink: 1 }}>
          {text}
        </AppText>
      </View>
    </PressableScale>
  );
}
