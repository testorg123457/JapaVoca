/**
 * LockThemeScreen — 잠금화면 퀴즈 테마 선택.
 * 이 화면 자체는 일반 앱 디자인 시스템(라이트/다크 토큰)을 따른다.
 * 각 테마는 색 스와치 미니 프리뷰로 보여주고, 탭하면 선택·영속.
 */
import React, { useState } from 'react';
import { ImageBackground, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Icon, PressableScale, useToast } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { themeList } from '../../theme/quiz/themes';
import { CUSTOM_THEME_ID } from '../../theme/quiz/themes/custom';
import { pickFromGallery } from '../../lib/translate/imageSource';
import {
  getQuizPhotoUri,
  getQuizThemeId,
  setQuizPhotoUri,
  setQuizThemeId,
} from '../../store/quizTheme';

export default function LockThemeScreen(): React.JSX.Element {
  const { showToast } = useToast();
  const c = useThemeColors();
  const [selected, setSelected] = useState<string>(getQuizThemeId());
  const [photoUri, setPhotoUri] = useState<string | undefined>(getQuizPhotoUri());

  const choose = (id: string) => {
    setSelected(id);
    setQuizThemeId(id);
  };

  /** 커스텀 테마 — 사진이 있어야 의미가 있으므로 없으면 고르는 것부터 띄운다. */
  const chooseCustom = async () => {
    if (!photoUri) {
      await pickPhoto();
      return;
    }
    choose(CUSTOM_THEME_ID);
  };

  const pickPhoto = async () => {
    try {
      const picked = await pickFromGallery();
      if (!picked) { return; } // 취소
      setQuizPhotoUri(picked.uri);
      setPhotoUri(picked.uri);
      choose(CUSTOM_THEME_ID);
    } catch {
      showToast('사진을 불러오지 못했어요. 다른 사진을 골라주세요', 'error');
    }
  };

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="잠금화면 디자인" showBack />
      <ScrollView contentContainerClassName="gap-lg px-xl py-xl" showsVerticalScrollIndicator={false}>
        <AppText variant="caption" className="text-text-tertiary">
          잠금화면 퀴즈에 적용할 테마를 골라요. 다음 잠금화면부터 반영돼요.
        </AppText>

        {/* 커스텀 — 내 사진 배경 (목록 맨 위) */}
        <PressableScale onPress={chooseCustom}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            padding: 14, borderRadius: radius.lg,
            backgroundColor: c['bg-primary'],
            borderWidth: 1.5,
            borderColor: selected === CUSTOM_THEME_ID ? c.brand : c['border-secondary'],
          }}>
            {photoUri ? (
              <ImageBackground
                source={{ uri: photoUri }}
                resizeMode="cover"
                style={{
                  width: 56, height: 56, overflow: 'hidden',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
                imageStyle={{ borderRadius: 12 }}>
                {/* 실제 화면처럼 패널 위에 선택지가 놓인 모습 */}
                <View style={{
                  paddingVertical: 5, paddingHorizontal: 6, borderRadius: 8, gap: 4,
                  backgroundColor: 'rgba(20,22,28,0.82)',
                }}>
                  <View style={{ width: 30, height: 7, borderRadius: 4, backgroundColor: '#1E2129' }} />
                  <View style={{ width: 30, height: 7, borderRadius: 4, backgroundColor: '#4DB882' }} />
                </View>
              </ImageBackground>
            ) : (
              <View style={{
                width: 56, height: 56, borderRadius: 12,
                backgroundColor: c['bg-tertiary'],
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="image" size={22} color={c['text-tertiary']} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" style={{ color: c['text-primary'] }}>내 사진</AppText>
              <AppText variant="caption" style={{ color: c['text-tertiary'] }}>
                {photoUri ? '내 사진을 배경으로' : '갤러리에서 사진을 골라요'}
              </AppText>
            </View>
            {/* 사진이 있으면 카드 안 우측에 '변경' 칩 — 멀리 떨어진 버튼 대신 손 닿는 곳에.
                칩 탭은 카드 탭(적용)을 가로채고 바로 갤러리를 연다. */}
            {photoUri ? (
              <PressableScale
                onPress={pickPhoto}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
                  backgroundColor: c['bg-tertiary'],
                }}>
                <Icon name="image" size={14} color={c['text-secondary']} />
                <AppText variant="caption" style={{ color: c['text-secondary'], fontWeight: '700' }}>
                  변경
                </AppText>
              </PressableScale>
            ) : null}
            {selected === CUSTOM_THEME_ID && (
              <Icon name="check-circle" size={22} color={c.brand} strokeWidth={2} />
            )}
          </View>
        </PressableScale>

        {themeList.filter((t) => t.id !== CUSTOM_THEME_ID).map((t) => {
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
                {/* 미니 프리뷰: 실제 배경 위에 선택지 + 브랜드 버튼 */}
                {t.shape.background.kind === 'image' ? (
                  <ImageBackground
                    source={t.shape.background.source}
                    resizeMode="cover"
                    style={{
                      width: 56, height: 56, overflow: 'hidden',
                      alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                    imageStyle={{ borderRadius: 12 }}>
                    <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.surface }} />
                    <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.brand }} />
                  </ImageBackground>
                ) : (
                  <View style={{
                    width: 56, height: 56, borderRadius: 12, overflow: 'hidden',
                    backgroundColor: t.colors.bg,
                    borderWidth: 1, borderColor: t.colors.line,
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.surface }} />
                    <View style={{ width: 34, height: 9, borderRadius: 4, backgroundColor: t.colors.brand }} />
                  </View>
                )}
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

        <AppText variant="caption" className="text-text-tertiary">
          '내 사진'은 밝거나 복잡한 사진에서도 읽히도록, 문제와 선택지를 불투명한 패널 위에 표시해요.
        </AppText>
      </ScrollView>
    </View>
  );
}
