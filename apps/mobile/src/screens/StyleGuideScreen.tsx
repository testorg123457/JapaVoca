/**
 * StyleGuideScreen — 디자인 토큰/컴포넌트 확인용 데모 화면.
 *
 * 배달의민족(배시시) 테마: 민트 brand + 옐로 포인트 + 따뜻한 그레이.
 * 다크 모드는 시스템 설정을 따라가므로, 기기 테마를 바꾸면 라이트/다크 양쪽을 확인할 수 있다.
 * 색은 semantic 토큰 className, 인라인 색은 useThemeColors()/primitives로 적용.
 */
import React, { useState } from 'react';
import { ScrollView, StatusBar, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, CashBadge } from '../components';
import { brand, gray, hairline, spacing, typography, yellow } from '../theme/tokens';
import { useColorSchemeMode, useThemeColors } from '../theme/ThemeProvider';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-3xl">
      <AppText variant="heading" className="text-text-primary mb-md">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Swatch({ name, color }: { name: string; color: string }) {
  const c = useThemeColors();
  return (
    <View className="items-center" style={{ width: 52 }}>
      <View
        className="rounded-sm"
        style={{
          width: 44,
          height: 44,
          backgroundColor: color,
          borderWidth: hairline,
          borderColor: c['border-secondary'],
        }}
      />
      <AppText variant="caption" className="text-text-tertiary mt-xs" style={{ fontSize: 11 }}>
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

export default function StyleGuideScreen() {
  const [text, setText] = useState('');
  const scheme = useColorSchemeMode();
  const c = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c['bg-secondary'] }} edges={['top']}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={c['bg-secondary']}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-2xl">
          <View className="self-start rounded-full bg-brand-subtle px-md py-xs">
            <AppText variant="caption" className="text-brand">
              JapaVoca · 디자인 시스템
            </AppText>
          </View>
          <AppText variant="display" className="text-text-primary mt-md">
            배달의민족 스타일 가이드
          </AppText>
          <AppText variant="caption" className="text-text-tertiary mt-xs">
            민트 brand · 옐로 포인트 · 따뜻한 그레이 · Pretendard · 현재 모드: {scheme}
          </AppText>
        </View>

        {/* 색 팔레트 */}
        <Section title="Brand (민트)">
          <SwatchRow
            entries={(['50', '100', '200', '300', '400', '500', '600'] as const).map((k) => [
              k,
              brand[k],
            ])}
          />
        </Section>

        <Section title="Yellow (포인트)">
          <SwatchRow
            entries={(['300', '400', '500'] as const).map((k) => [k, yellow[k]])}
          />
        </Section>

        <Section title="Neutral (따뜻한 그레이)">
          <SwatchRow
            entries={(['50', '100', '200', '300', '400', '500', '600', '700', '900'] as const).map(
              (k) => [k, gray[k]],
            )}
          />
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

        {/* 캐시 잔액 카드 (브랜드 면) */}
        <Section title="캐시 잔액">
          <View className="bg-brand rounded-lg p-xl">
            <AppText variant="caption" className="text-on-brand" style={{ opacity: 0.85 }}>
              내 캐시
            </AppText>
            <View className="flex-row items-end mt-sm">
              <AppText variant="display" className="text-on-brand">
                12,840
              </AppText>
              <AppText
                variant="title"
                className="text-on-brand"
                style={{ marginLeft: 4, marginBottom: 3, opacity: 0.85 }}>
                C
              </AppText>
            </View>
            <View
              className="self-start rounded-full px-md py-sm mt-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <AppText variant="caption" className="text-on-brand">
                오늘 +320C 적립
              </AppText>
            </View>
          </View>
        </Section>

        {/* 타이포 */}
        <Section title="타이포그래피">
          <Card>
            <AppText variant="display" className="text-text-primary">
              Display 28
            </AppText>
            <AppText variant="title" className="text-text-primary mt-sm">
              Title 20
            </AppText>
            <AppText variant="heading" className="text-text-primary mt-sm">
              Heading 17
            </AppText>
            <AppText variant="body" className="text-text-secondary mt-sm">
              Body 15 — 본문은 text-secondary로 차분하게.
            </AppText>
            <AppText variant="caption" className="text-text-tertiary mt-sm">
              Caption 13 — 보조 정보는 text-tertiary.
            </AppText>
          </Card>
        </Section>

        {/* 버튼 */}
        <Section title="버튼">
          <View style={{ gap: spacing.md }}>
            <Button title="기본 버튼 (Primary)" variant="filled" />
            <Button title="서브 버튼 (Soft)" variant="soft" />
            <Button title="아웃라인 (Secondary)" variant="outline" />
            <Button title="비활성 버튼" variant="filled" disabled />
          </View>
        </Section>

        {/* 카드 */}
        <Section title="카드">
          <Card>
            <AppText variant="heading" className="text-text-primary">
              오늘의 학습
            </AppText>
            <AppText variant="body" className="text-text-secondary mt-xs">
              한자 단어 12개 복습 예정이에요. 지금 시작해볼까요?
            </AppText>
            <View className="flex-row mt-md" style={{ gap: spacing.sm }}>
              <View className="rounded-full bg-success-subtle px-md py-sm">
                <AppText variant="caption" className="text-success">
                  정답 +10
                </AppText>
              </View>
              <View className="rounded-full bg-danger-subtle px-md py-sm">
                <AppText variant="caption" className="text-danger">
                  오답
                </AppText>
              </View>
              <View className="rounded-full bg-amber-subtle px-md py-sm">
                <AppText variant="caption" className="text-amber">
                  잭팟
                </AppText>
              </View>
            </View>
          </Card>
        </Section>

        {/* 입력창 */}
        <Section title="입력창">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor={c['text-tertiary']}
            className="bg-bg-primary border-border-secondary rounded-sm px-lg py-md text-text-primary"
            style={[typography.body, { borderWidth: hairline }]}
          />
        </Section>

        {/* 캐시 뱃지 (pill) */}
        <Section title="캐시 뱃지">
          <View className="flex-row" style={{ gap: spacing.sm }}>
            <CashBadge amount="+320" />
            <CashBadge amount="+1,000" />
            <CashBadge amount="브랜드" variant="brand" />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
