/**
 * StyleGuideScreen — 디자인 토큰 룩 확인용 데모 화면.
 *
 * 토스st 테마(둥글둥글·부드러운 그림자)를 NativeWind + 공용 컴포넌트로 렌더합니다.
 * 색/라운드/간격은 className(tailwind.config.ts ← tokens.ts), 타이포는 AppText로 적용.
 */
import React, { useState } from 'react';
import { ScrollView, StatusBar, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, CashBadge } from '../components';
import { colors, shadowStyle, spacing, typography } from '../theme/tokens';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-3xl">
      <AppText variant="title" className="text-text-strong mb-md">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View className="rounded-pill px-md py-sm" style={{ backgroundColor: bg }}>
      <AppText variant="caption" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

export default function StyleGuideScreen() {
  const [text, setText] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['3xl'] * 2 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-2xl">
          <View className="self-start rounded-pill bg-brand-soft px-md py-xs">
            <AppText variant="caption" className="text-brand">
              JapaVoca · 디자인 시스템
            </AppText>
          </View>
          <AppText variant="display" className="text-text-strong mt-md">
            토스st 스타일 가이드
          </AppText>
          <AppText variant="caption" className="text-text-weak mt-xs">
            둥글둥글 · 부드러운 그림자 · Pretendard · NativeWind
          </AppText>
        </View>

        {/* 캐시 잔액 카드 */}
        <Section title="캐시 잔액">
          <View className="bg-brand rounded-xl p-xl" style={shadowStyle('float')}>
            <AppText variant="caption" style={{ color: '#DCEAFF' }}>
              내 캐시
            </AppText>
            <View className="flex-row items-end mt-sm">
              <AppText variant="display" className="text-white">
                12,840
              </AppText>
              <AppText variant="title" style={{ color: '#DCEAFF', marginLeft: 4, marginBottom: 3 }}>
                원
              </AppText>
            </View>
            <View className="self-start rounded-pill bg-gold px-md py-sm mt-lg">
              <AppText variant="caption" className="text-text-strong">
                오늘 +320원 적립
              </AppText>
            </View>
          </View>
        </Section>

        {/* 버튼 */}
        <Section title="버튼">
          <View style={{ gap: spacing.sm }}>
            <Button title="기본 버튼 (Filled)" variant="filled" />
            <Button title="서브 버튼 (Soft)" variant="soft" />
            <Button title="아웃라인 버튼" variant="outline" />
          </View>
        </Section>

        {/* 카드 */}
        <Section title="카드">
          <Card>
            <AppText variant="title" className="text-text-strong">
              오늘의 학습
            </AppText>
            <AppText variant="body" className="text-text mt-xs">
              한자 단어 12개 복습 예정이에요. 지금 시작하면 +50원!
            </AppText>
            <View className="flex-row mt-md" style={{ gap: spacing.sm }}>
              <Chip label="정답 +10" color={colors.success} bg="#E8F7EE" />
              <Chip label="오답 -5" color={colors.danger} bg="#FDECEC" />
              <Chip label="잭팟" color={colors.warning} bg="#FEF4E2" />
            </View>
          </Card>
        </Section>

        {/* 입력창 */}
        <Section title="입력창">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor={colors.textWeak}
            className="bg-bg rounded-lg border border-border px-lg py-md text-text-strong"
            style={typography.body}
          />
        </Section>

        {/* 캐시 뱃지 (pill) */}
        <Section title="캐시 뱃지">
          <View className="flex-row" style={{ gap: spacing.sm }}>
            <CashBadge amount="+320" />
            <CashBadge amount="+1,000" />
            <CashBadge amount="JACKPOT" gold />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
