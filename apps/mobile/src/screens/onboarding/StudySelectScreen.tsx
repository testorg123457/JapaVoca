/**
 * 온보딩 — 학습 트랙 선택(풀스크린). StudySelector + 하단 CTA.
 * 저장 성공 시 me invalidate → 게이트가 ready 로 → Main 진입.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, StudySelector } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe, useUpdateProfile } from '../../api/hooks';
import { isStudyValid, type StudySelection } from './studyContent';
import { useOnboardingActions } from '../../navigation/OnboardingStack';

export default function StudySelectScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { onComplete } = useOnboardingActions();
  const me = useMe();
  const update = useUpdateProfile();
  const [sel, setSel] = useState<StudySelection>({
    mode: null,
    level: null,
    hiragana: false,
    katakana: false,
  });

  const valid = isStudyValid(sel);

  async function onStart() {
    if (!valid || update.isPending) {
      return;
    }
    try {
      await update.mutateAsync({
        study_mode: sel.mode,
        study_level: sel.level,
        study_kana_hiragana: sel.hiragana,
        study_kana_katakana: sel.katakana,
      });
      onComplete();
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해주세요.');
    }
  }

  if (!me.data) {
    return (
      <SafeAreaView
        className="flex-1 bg-bg-secondary items-center justify-center"
        edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={c.brand} />
      </SafeAreaView>
    );
  }

  const modeLabel: Record<string, string> = { kanji: '한자', kanji_word: '한자단어', kana_word: '가나단어', kana: '가나' };
  const ctaLabel = sel.mode
    ? `${modeLabel[sel.mode]} ${sel.level ?? ''}`.trim() + ' 시작하기'
    : '시작하기';

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerClassName="px-2xl pt-3xl pb-2xl"
        showsVerticalScrollIndicator={false}>
        <AppText
          variant="micro"
          className="text-text-tertiary"
          style={{ letterSpacing: 1.5 }}>
          학습 설정
        </AppText>
        <AppText
          variant="display"
          className="text-text-primary"
          style={{ marginTop: 12, lineHeight: 34 }}>
          어디서부터{'\n'}시작할까요?
        </AppText>
        <AppText
          variant="body"
          className="text-text-secondary"
          style={{ marginTop: 8, marginBottom: 28 }}>
          한 가지를 골라 시작해요. 설정에서 언제든 바꿀 수 있어요.
        </AppText>
        <StudySelector value={sel} onChange={setSel} />
      </ScrollView>
      <View className="px-2xl pt-md pb-lg">
        <Button
          title={ctaLabel}
          size="lg"
          onPress={onStart}
          disabled={!valid}
          loading={update.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
