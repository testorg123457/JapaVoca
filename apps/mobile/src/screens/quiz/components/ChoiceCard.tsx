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
      // choiceOutline 테마(대비 약한 다크)는 기본 선택지에도 line 테두리를 그려 구분.
      return { bg: c.surface, border: theme.shape.choiceOutline ? c.line : 'transparent', text: c.textPrimary, icon: null };
  }
}

/**
 * 4지선다 글자 크기 — **네 장이 같은 크기를 쓰도록 '가장 긴 선택지' 하나로 정한다.**
 *
 * ⚠️ 카드마다 자기 글자 수로 크기를 정하면 안 된다. 그렇게 하면 2글자(勉強)와
 *    3글자(自動車)가 한 화면에 나란히 놓이면서 크기가 눈에 띄게 달라 보인다.
 *    글자 수는 문제마다 제각각인데 크기까지 따라 움직이면 그리드가 정돈돼 보이지 않는다.
 *
 * 줄어드는 폭도 한 단계 2px로 완만하게 뒀다(예전엔 4px씩 떨어져 한 글자 차이에
 * 15%씩 작아졌다). 길이가 정말 길 때만 조금씩 양보한다.
 *
 * 기준선: 가장 좁은 360dp 화면에서 카드 안쪽 폭이 약 125px다(콘텐츠 패딩 22 +
 * 카드 48.5% + 카드 패딩 14×2). 한글·한자는 글자폭이 글자 크기와 거의 같으므로
 * `글자수 × 크기 <= 125`면 한 줄에 들어간다. 그래서 4글자까지는 26으로 묶고
 * (4×26=104), 5글자는 24로 한 단계만 내린다(5×26=130이면 작은 폰에서 두 줄).
 * 한 줄에 담는 건 5글자까지가 한계다(6글자를 한 줄에 넣으려면 20px, 7글자는 17px까지
 * 줄여야 한다). 그 아래로는 한 줄 맞추기를 포기하고 두 줄로 넘긴다 — 작게 만들어
 * 한 줄에 밀어넣는 것보다 두 줄이 읽기 낫다.
 *
 * 두 줄까지 허용이므로(numberOfLines=2) 실질 한도는 `글자수 × 크기 <= 카드폭 × 2`다.
 * 세로도 28px 두 줄(lineHeight 1.2 → 67.2px)이 카드 안(minHeight 88 − 세로패딩 20 = 68)에
 * 들어간다. 그래서 두 줄 구간에서도 크기를 급하게 줄일 이유가 없다.
 *
 * ⚠️ 카드 폭은 테마마다 다르다. '내 사진' 테마는 문제+선택지를 패널로 한 번 더 감싸서
 *    좌우 14씩을 더 먹기 때문에 약 11% 좁다. 그 폭을 안 넘겨주면 그 테마에서만
 *    글자가 예산을 넘겨 카드 하나가 따로 줄어든다.
 */
/** 기본 테마에서 카드 안쪽 폭(360dp 기준): 화면 360 − 콘텐츠 패딩 44 → 48.5% → 카드 패딩 28. */
export const CARD_INNER_W_DEFAULT = 125;
/** contentPanel 테마(내 사진): 패널 좌우 패딩 14씩이 더 붙는다. */
export const CARD_INNER_W_PANEL = 111;

/**
 * 읽을 수 있는 하한. 이보다 작게 만들면서까지 칸에 욱여넣지 않는다.
 * 아주 긴 선택지는 두 줄로도 안 들어가는데, 그때는 네 장이 같은 크기를 유지하는 쪽을
 * 택하고 줄바꿈에 맡긴다(한 장만 작아지는 것보다 낫다).
 */
export const CHOICE_MIN_FONT_SIZE = 14;

/**
 * [최대 글자수, 크기]. 한 단계 2px 이하로만 떨어뜨려 한 글자 차이로 확 작아지지 않게 한다.
 * 앞 6줄은 실기기 기준으로 고른 값이고, 뒤는 그 기울기를 이어 하한까지 내린 것이다.
 */
const SIZE_TABLE: ReadonlyArray<readonly [number, number]> = [
  [1, 28], [4, 26], [7, 24], [10, 22], [12, 20],
  // 여기부터는 두 줄 예산(폭×2)을 실제로 지키도록 맞춘 값이다.
  [13, 19], [14, 17], [15, 16], [16, 15], [17, CHOICE_MIN_FONT_SIZE],
];
export function choiceFontSize(texts: string[], cardWidth = CARD_INNER_W_DEFAULT): number {
  const longest = texts.reduce((max, t) => Math.max(max, [...t].length), 0);
  if (longest <= 0) { return 28; }

  // 카드가 좁으면 그만큼 글자가 더 긴 셈으로 쳐서 같은 표를 쓴다.
  const scaled = longest * (CARD_INNER_W_DEFAULT / cardWidth);

  for (const [maxLen, size] of SIZE_TABLE) {
    if (scaled <= maxLen) { return size; }
  }
  return CHOICE_MIN_FONT_SIZE;
}

export function ChoiceCard({
  text, visual, disabled, onPress, widthPercent = '48.5%', fontSize,
}: ChoiceCardProps & { widthPercent?: string; fontSize?: number }): React.JSX.Element {
  const theme = useQuizTheme();
  const s = choiceCardStyle(theme, visual);
  // 크기는 호출부가 네 장 몫을 한 번에 정해 내려준다. 단독으로 쓰일 때만 자기 글자로 계산.
  const size = fontSize ?? choiceFontSize([text]);
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
          style={{ color: s.text, fontSize: size, lineHeight: size * 1.2, textAlign: 'center', flexShrink: 1 }}>
          {text}
        </AppText>
      </View>
    </PressableScale>
  );
}
