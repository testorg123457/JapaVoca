/**
 * StyleGuideScreen — 디자인 시스템 쇼케이스(합격 기준 화면).
 *
 * Vermilion 테마: Primary mint + Cash 옐로 + 따뜻한 그레이(Ink 텍스트) + Pretendard.
 * 토큰/컴포넌트가 실제로 어떻게 조립되는지 한눈에 본다. 기기 테마를 바꾸면
 * 라이트/다크 양쪽을 확인할 수 있다(semantic 토큰이 한 곳에서 전환됨).
 */
import React, { useState } from 'react';
import { ScrollView, StatusBar, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  Card,
  CashBadge,
  Gradient,
  Icon,
  ProgressBar,
  SectionHeader,
  Tag,
  type IconName,
} from '../components';
import { gradients, gray, hairline, spacing, typography, mint, yellow } from '../theme/tokens';
import { useColorSchemeMode, useThemeColors } from '../theme/ThemeProvider';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-md">
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

function Swatch({ name, color }: { name: string; color: string }) {
  const c = useThemeColors();
  return (
    <View className="items-center" style={{ width: 52 }}>
      <View
        className="rounded-md"
        style={{ width: 46, height: 46, backgroundColor: color, borderWidth: hairline, borderColor: c['border-secondary'] }}
      />
      <AppText variant="micro" className="text-text-tertiary mt-xs">
        {name}
      </AppText>
    </View>
  );
}

function SwatchRow({ entries }: { entries: [string, string][] }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: spacing.sm }}>
      {entries.map(([name, color]) => (
        <Swatch key={name} name={name} color={color} />
      ))}
    </View>
  );
}

const ALL_ICONS: IconName[] = [
  'home', 'wallet', 'settings', 'flame', 'gift', 'check', 'check-circle', 'close',
  'chevron-right', 'chevron-down', 'coin', 'book', 'pencil', 'sparkles', 'user',
  'document', 'shield', 'logout', 'arrow-up-right', 'arrow-down-left',
];

export default function StyleGuideScreen() {
  const [text, setText] = useState('');
  const scheme = useColorSchemeMode();
  const c = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c['bg-secondary'] }} edges={['top']}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c['bg-secondary']} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['6xl'], gap: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="gap-sm">
          <Tag label="JapaVoca · 디자인 시스템" variant="brand" leftIcon="sparkles" />
          <AppText variant="display" className="text-text-primary mt-sm">
            Vermilion 스타일 가이드
          </AppText>
          <AppText variant="caption" className="text-text-tertiary">
            Vermilion Primary · Cash 옐로 · Ink 텍스트 · 흰 배경 · Pretendard · 현재 모드: {scheme}
          </AppText>
        </View>

        {/* 캐시 잔액 hero */}
        <View
          className="overflow-hidden rounded-xl p-xl"
          style={{ shadowColor: c.brand, shadowOpacity: 0.32, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
          <Gradient colors={gradients.brand} direction="diagonal" />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Icon name="coin" size={18} color={yellow[400]} />
              <AppText variant="label" style={{ color: 'rgba(255,255,255,0.92)' }}>
                내 캐시
              </AppText>
            </View>
            <View className="flex-row items-center" style={{ gap: 2 }}>
              <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.92)' }}>
                지갑
              </AppText>
              <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.92)" strokeWidth={2.4} />
            </View>
          </View>
          <View className="mt-md flex-row items-end" style={{ gap: 4 }}>
            <AppText variant="hero" className="text-on-brand">
              12,840
            </AppText>
            <AppText variant="title" className="text-on-brand" style={{ marginBottom: 6, opacity: 0.9 }}>
              C
            </AppText>
          </View>
          <View className="mt-md self-start rounded-full px-md py-xs" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <AppText variant="micro" className="text-on-brand" style={{ fontSize: 12 }}>
              오늘 +320C 적립
            </AppText>
          </View>
        </View>

        {/* 타이포그래피 */}
        <Section title="타이포그래피">
          <Card className="gap-sm">
            <AppText variant="hero" className="text-text-primary">Hero 34</AppText>
            <AppText variant="display" className="text-text-primary">Display 26</AppText>
            <AppText variant="title" className="text-text-primary">Title 19</AppText>
            <AppText variant="heading" className="text-text-primary">Heading 16 · SemiBold</AppText>
            <AppText variant="subheading" className="text-text-primary">Subheading 15 · SemiBold</AppText>
            <AppText variant="body" className="text-text-secondary">Body 14 — 본문은 secondary로 차분하게 읽힌다.</AppText>
            <AppText variant="label" className="text-text-primary">Label 13 · SemiBold (버튼·탭·칩)</AppText>
            <AppText variant="caption" className="text-text-tertiary">Caption 12 — 보조 정보.</AppText>
            <AppText variant="micro" className="text-text-tertiary">Micro 11 — 가장 작은 라벨.</AppText>
          </Card>
        </Section>

        {/* 버튼 */}
        <Section title="버튼">
          <View style={{ gap: spacing.md }}>
            <Button title="기본 버튼 (Primary)" variant="filled" leftIcon="check" />
            <View className="flex-row" style={{ gap: spacing.md }}>
              <Button title="Soft" variant="soft" className="flex-1" />
              <Button title="Outline" variant="outline" className="flex-1" />
              <Button title="Ghost" variant="ghost" className="flex-1" />
            </View>
            <View className="flex-row items-center" style={{ gap: spacing.md }}>
              <Button title="Small" size="sm" />
              <Button title="로딩 중" loading />
              <Button title="비활성" disabled />
            </View>
          </View>
        </Section>

        {/* 카드 */}
        <Section title="카드 위계">
          <View style={{ gap: spacing.md }}>
            <Card variant="default">
              <AppText variant="subheading" className="text-text-primary">Default</AppText>
              <AppText variant="caption" className="text-text-tertiary mt-xs">기본 카드 — 옅은 그림자로 살짝 떠 있음.</AppText>
            </Card>
            <Card variant="elevated">
              <AppText variant="subheading" className="text-text-primary">Elevated</AppText>
              <AppText variant="caption" className="text-text-tertiary mt-xs">강조 카드 — 더 띄워서 시선을 끈다.</AppText>
            </Card>
            <Card variant="flat">
              <AppText variant="subheading" className="text-text-primary">Flat</AppText>
              <AppText variant="caption" className="text-text-tertiary mt-xs">그림자 없이 보더만 — 조용한 면.</AppText>
            </Card>
            <Card onPress={() => {}}>
              <AppText variant="subheading" className="text-text-primary">Pressable</AppText>
              <AppText variant="caption" className="text-text-tertiary mt-xs">눌러보세요 — 살짝 들어갑니다.</AppText>
            </Card>
          </View>
        </Section>

        {/* 칩 */}
        <Section title="태그 / 칩">
          <View className="flex-row flex-wrap" style={{ gap: spacing.sm }}>
            <Tag label="5일 연속" variant="amber" leftIcon="flame" />
            <Tag label="N5" variant="brand" />
            <Tag label="정답" variant="success" leftIcon="check" />
            <Tag label="오답" variant="danger" leftIcon="close" />
            <Tag label="일반" variant="neutral" leftIcon="gift" />
          </View>
        </Section>

        {/* 진행감 */}
        <Section title="진행 바">
          <View className="gap-md">
            <ProgressBar progress={0.25} />
            <ProgressBar progress={0.6} />
            <ProgressBar progress={0.9} />
          </View>
        </Section>

        {/* 아이콘셋 */}
        <Section title="아이콘셋 (SVG)">
          <Card variant="flat">
            <View className="flex-row flex-wrap" style={{ gap: spacing.xl }}>
              {ALL_ICONS.map((name) => (
                <View key={name} className="items-center" style={{ width: 56, gap: 4 }}>
                  <Icon name={name} size={24} color={c['text-primary']} />
                  <AppText variant="micro" className="text-text-tertiary" numberOfLines={1}>
                    {name}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </Section>

        {/* 캐시 뱃지 */}
        <Section title="캐시 뱃지">
          <View className="flex-row" style={{ gap: spacing.sm }}>
            <CashBadge amount="12,840 C" />
            <CashBadge amount="+1,000" variant="earn" />
          </View>
        </Section>

        {/* 입력창 */}
        <Section title="입력창">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor={c['text-tertiary']}
            className="bg-bg-primary border-border-secondary rounded-md px-lg text-text-primary"
            style={[typography.body, { borderWidth: hairline, height: 52 }]}
          />
        </Section>

        {/* 글자색 (Ink/그레이 — 메인색을 글자색으로 쓰지 않는다) */}
        <Section title="글자색">
          <Card className="gap-sm">
            <AppText variant="subheading" className="text-text-primary">Primary — Ink #1A1A1A (기본)</AppText>
            <AppText variant="subheading" className="text-text-secondary">Secondary — gray-600 #666060</AppText>
            <AppText variant="subheading" className="text-text-tertiary">Caption — gray-500 #8A8280</AppText>
            <AppText variant="subheading" className="text-brand">Brand — mint-500 (강조에만)</AppText>
            <AppText variant="subheading" style={{ color: yellow[600] }}>Cash — yellow-600 #B38F00 (캐시 글자)</AppText>
          </Card>
        </Section>

        {/* 색 팔레트 */}
        <Section title="Vermilion (Primary · 9단계)">
          <SwatchRow entries={(['50', '100', '200', '300', '400', '500', '600', '700', '900'] as const).map((k) => [k, mint[k]])} />
        </Section>
        <Section title="Cash Yellow (7단계)">
          <SwatchRow entries={(['50', '100', '200', '400', '500', '600', '700'] as const).map((k) => [k, yellow[k]])} />
        </Section>
        <Section title="Neutral (뉴트럴 그레이 · 10단계)">
          <SwatchRow entries={(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const).map((k) => [k, gray[k]])} />
        </Section>
        <Section title="Semantic">
          <SwatchRow
            entries={[
              ['success', c.success],
              ['warning', c.warning],
              ['danger', c.danger],
              ['info', c.info],
            ]}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
