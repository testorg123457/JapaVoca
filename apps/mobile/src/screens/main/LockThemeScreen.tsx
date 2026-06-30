/**
 * LockThemeScreen — 잠금화면 퀴즈 테마 선택.
 * 이 화면 자체는 일반 앱 디자인 시스템(라이트/다크 토큰)을 따른다.
 * 각 테마는 색 스와치 미니 프리뷰로 보여주고, 탭하면 선택·영속.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Icon, PressableScale } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { themeList } from '../../theme/quiz/themes';
import { getQuizThemeId, setQuizThemeId } from '../../store/quizTheme';

export default function LockThemeScreen(): React.JSX.Element {
  const c = useThemeColors();
  const [selected, setSelected] = useState<string>(getQuizThemeId());

  const choose = (id: string) => {
    setSelected(id);
    setQuizThemeId(id);
  };

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="잠금화면 디자인" showBack />
      <ScrollView contentContainerClassName="gap-lg px-xl py-xl" showsVerticalScrollIndicator={false}>
        <AppText variant="caption" className="text-text-tertiary">
          잠금화면 퀴즈에 적용할 테마를 골라요. 다음 잠금화면부터 반영돼요.
        </AppText>
        {themeList.map((t) => {
          const active = t.id === selected;
          return (
            <PressableScale key={t.id} onPress={() => choose(t.id)}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: radius.lg,
                backgroundColor: c['bg-primary'],
                borderWidth: 1.5,
                borderColor: active ? c.brand : c['border-secondary'],
              }}>
                {/* 미니 프리뷰: 배경 + 선택지 2개 + 브랜드 점 */}
                <View style={{
                  width: 56, height: 56, borderRadius: 12, overflow: 'hidden',
                  backgroundColor: t.colors.bg,
                  borderWidth: 1, borderColor: t.colors.line,
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.surface }} />
                  <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.brand }} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" style={{ color: c['text-primary'] }}>{t.name}</AppText>
                  <AppText variant="caption" style={{ color: c['text-tertiary'] }}>
                    {t.scheme === 'dark' ? '어두운 테마' : '밝은 테마'}
                  </AppText>
                </View>
                {active && <Icon name="check-circle" size={22} color={c.brand} strokeWidth={2} />}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}
