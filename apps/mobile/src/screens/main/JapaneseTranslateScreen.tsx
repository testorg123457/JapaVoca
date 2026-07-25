/**
 * JapaneseTranslateScreen — 일본어 번역 진입(촬영 화면).
 *
 * 카메라로 촬영하거나 사진에서 골라, 서버(AI)로 OCR+번역한다.
 * 카메라 → 크롭 → 결과, 사진 → 크롭 → 결과.
 *
 * 디자인: 파파고·구글렌즈형 촬영 UI. 어두운 전체화면 + AF 코너로 감싼 뷰파인더 +
 * 하단 컨트롤(가운데 큰 원형 셔터 / 왼쪽 갤러리). 카메라 화면이라 라이트/다크
 * 무관하게 다크로 커밋한다(모든 카메라 앱의 관습). 색은 tokens 프리미티브만.
 * ⚠️ 한자를 장식으로 깔지 말 것(촌스러움). docs/디자인-시스템-원칙.md 참조.
 */
import React, { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { AppText, Icon, PressableScale, useToast } from '../../components';
import { gray, mint, radius } from '../../theme/tokens';
import { pickFromCamera, pickFromGallery } from '../../lib/translate/imageSource';
import type { PickedImage } from '../../lib/translate/imageSource';
import { classifyTranslateError, errorMessage } from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

const BG = gray[900]; // 카메라 다크 그라운드

export default function JapaneseTranslateScreen(): React.JSX.Element {
  const navigation =
    useNavigation<MainStackScreenProps<'JapaneseTranslate'>['navigation']>();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  async function run(
    pick: () => Promise<PickedImage | null>,
    onPicked: (img: PickedImage) => void,
  ) {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const img = await pick();
      if (img) {
        onPicked(img);
      }
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // 카메라·갤러리 모두 크롭(범위 선택)을 거쳐 결과로 간다.
  const onCamera = () =>
    run(pickFromCamera, (img) => navigation.navigate('TranslateCrop', { image: img }));
  const onGallery = () =>
    run(pickFromGallery, (img) => navigation.navigate('TranslateCrop', { image: img }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* 상단 바 */}
      <View className="flex-row items-center" style={{ height: 52, paddingHorizontal: 8 }}>
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          className="items-center justify-center"
          style={{ width: 44, height: 44 }}>
          <Icon name="arrow-left" size={24} color={gray[0]} />
        </PressableScale>
        <AppText variant="subheading" style={{ color: gray[0], marginLeft: 2 }}>
          일본어 번역
        </AppText>
      </View>

      {/* 헤드라인 */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <AppText variant="display" style={{ color: gray[0] }}>
          카메라를 대면{'\n'}바로 번역돼요
        </AppText>
        <AppText variant="body" style={{ color: gray[400], marginTop: 8, lineHeight: 22 }}>
          간판·메뉴·책 속 일본어를 프레임에 담아 보세요.
        </AppText>
      </View>

      {/* 뷰파인더 — AF 코너로 감싼 프레임 */}
      <View style={{ flex: 1, marginHorizontal: 24, marginTop: 22, marginBottom: 8 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Corner pos="tl" /><Corner pos="tr" />
          <Corner pos="bl" /><Corner pos="br" />
          <Icon name="camera" size={46} color={gray[600]} />
        </View>
      </View>

      {/* 촬영 후 범위 조절 안내 */}
      <AppText
        variant="caption"
        style={{ color: gray[500], textAlign: 'center', paddingHorizontal: 24 }}>
        찍은 뒤 번역할 부분만 골라낼 수 있어요.
      </AppText>

      {/* 하단 컨트롤 — 갤러리 · 셔터 · (대칭용 여백) */}
      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: 30, paddingTop: 14, paddingBottom: insets.bottom > 0 ? 10 : 22 }}>
        {/* 갤러리 */}
        <PressableScale
          onPress={onGallery}
          disabled={busy}
          pressedScale={0.94}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="갤러리에서 선택"
          className="items-center justify-center"
          style={{
            width: 62,
            height: 62,
            borderRadius: radius.lg,
            backgroundColor: gray[800],
            borderWidth: 1,
            borderColor: gray[700],
            opacity: busy ? 0.5 : 1,
          }}>
          <Icon name="image" size={32} color={gray[300]} />
        </PressableScale>

        {/* 셔터 */}
        <PressableScale
          onPress={onCamera}
          disabled={busy}
          pressedScale={0.92}
          accessibilityRole="button"
          accessibilityLabel="카메라로 촬영"
          className="items-center justify-center"
          style={{
            width: 80,
            height: 80,
            borderRadius: 999,
            borderWidth: 4,
            borderColor: gray[0],
            opacity: busy ? 0.6 : 1,
          }}>
          <View style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: mint[500] }} />
        </PressableScale>

        {/* 대칭용 여백(셔터 가운데 정렬) */}
        <View style={{ width: 62, height: 62 }} />
      </View>
    </SafeAreaView>
  );
}

/** AF 코너 브라켓 — 뷰파인더 네 귀퉁이. mint 색. */
function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }): React.JSX.Element {
  const base = {
    position: 'absolute' as const,
    width: 30,
    height: 30,
    borderColor: mint[500],
  };
  const map = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  };
  return <View style={[base, map[pos]]} />;
}
