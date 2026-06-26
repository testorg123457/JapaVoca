/**
 * 약관 동의 — 토스풍 레이아웃(우리 디자인 시스템: tokens + 공용 컴포넌트).
 *
 * 큰 타이틀 + 둥근 "전체 동의" 박스 + 원형 체크(선택=민트 채움) + 헤어라인 행 + 하단 큰 CTA.
 * 민트는 선택상태/활성박스/주액션(CTA)에만(디자인-시스템-원칙: 색은 기능적으로). 필수/선택
 * 라벨은 중립 그레이로 절제. 온보딩 게이트라 버밀리온 헤더 대신 깔끔한 헤더리스로 둔다.
 *
 * 필수(이용약관·개인정보·휴대폰번호[게스트 제외])를 모두 체크해야 "동의하고 계속" 활성.
 * 제출 성공 시 권한 화면(Permissions)으로 이동(휴대폰 번호는 권한 허용 후 수집 → phone_number=null).
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { AppText, Button, Icon } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useMe } from '../../api/hooks';
import { useSubmitConsent } from '../../api/consent';
import { isRequiredConsentComplete, type ConsentChecks } from './termsContent';
import type { OnboardingStackScreenProps, TermKind } from '../../navigation/types';

type Item = { key: keyof ConsentChecks; kind: TermKind; label: string; required: boolean };

const ALL_ITEMS: Item[] = [
  { key: 'terms', kind: 'terms', label: '이용약관 동의', required: true },
  { key: 'privacy', kind: 'privacy', label: '개인정보 수집·이용 동의', required: true },
  { key: 'phone', kind: 'phone', label: '휴대폰번호 데이터 동의', required: true },
  { key: 'marketing', kind: 'marketing', label: '마케팅 정보 수신 동의', required: false },
];

/** 토스풍 원형 체크 — 선택 시 민트 채움 + 흰 체크, 미선택 시 옅은 테두리 + 옅은 체크. */
function CircleCheck({ checked, size = 24 }: { checked: boolean; size?: number }): React.JSX.Element {
  const c = useThemeColors();
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: checked ? c.brand : 'transparent',
        borderWidth: checked ? 0 : 1.5,
        borderColor: c['border-secondary'],
      }}>
      <Icon
        name="check"
        size={Math.round(size * 0.6)}
        color={checked ? c['on-brand'] : c['border-secondary']}
        strokeWidth={3}
      />
    </View>
  );
}

export default function TermsScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<OnboardingStackScreenProps<'Terms'>['navigation']>();
  const me = useMe();
  const submit = useSubmitConsent();
  const isGuest = me.data?.is_guest ?? false;

  const [checks, setChecks] = useState<ConsentChecks>({
    terms: false,
    privacy: false,
    phone: false,
    marketing: false,
  });

  // 프로필(is_guest) 확정 전엔 행을 그리지 않는다 — 게스트가 잠깐 휴대폰번호 행을 보거나
  // 잘못 토글하는 것을 막는다(스펙: 게스트는 휴대폰번호 행 숨김).
  if (!me.data) {
    return (
      <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={c.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // 게스트는 휴대폰번호 행을 숨긴다.
  const items = ALL_ITEMS.filter((it) => it.key !== 'phone' || !isGuest);
  const requiredDone = isRequiredConsentComplete(checks, isGuest);
  // 전체동의: 보이는 항목(게스트면 phone 제외) 전부 체크 여부.
  const allChecked = items.every((it) => checks[it.key]);

  function toggle(key: keyof ConsentChecks) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAll() {
    const next = !allChecked;
    setChecks({ terms: next, privacy: next, phone: isGuest ? false : next, marketing: next });
  }

  async function onSubmit() {
    if (!requiredDone || submit.isPending) {
      return;
    }
    try {
      await submit.mutateAsync({
        marketing_agreed: checks.marketing,
        phone_data_agreed: isGuest ? false : checks.phone,
        phone_number: null,
      });
      navigation.navigate('Permissions');
    } catch {
      // 제출 실패 — 토스트 대신 버튼이 다시 활성화되며 재시도 가능.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerClassName="pb-2xl" showsVerticalScrollIndicator={false}>
        {/* 타이틀 */}
        <View className="px-2xl pt-3xl pb-2xl gap-sm">
          <AppText variant="display" className="text-text-primary" style={{ lineHeight: 38 }}>
            약관에 동의하고{'\n'}시작해요
          </AppText>
          <AppText variant="body" className="text-text-secondary">
            서비스 이용을 위해 동의가 필요해요.
          </AppText>
        </View>

        {/* 전체 동의 — 둥근 강조 박스 */}
        <View className="px-xl">
          <Pressable onPress={toggleAll} className="active:opacity-80">
            <View
              className={`flex-row items-center rounded-2xl px-xl py-lg ${
                allChecked ? 'bg-brand-subtle' : 'bg-bg-tertiary'
              }`}
              style={{ gap: 14 }}>
              <CircleCheck checked={allChecked} size={28} />
              <View className="flex-1">
                <AppText variant="heading" className="text-text-primary">
                  약관 전체 동의
                </AppText>
                <AppText variant="caption" className="text-text-tertiary">
                  필수·선택 항목을 모두 포함해요
                </AppText>
              </View>
            </View>
          </Pressable>
        </View>

        {/* 구분선 */}
        <View className="h-px bg-border-tertiary mx-2xl mt-xl mb-xs" />

        {/* 항목별 */}
        <View className="px-xl">
          {items.map((it) => (
            <View
              key={it.key}
              className="flex-row items-center py-md"
              style={{ gap: 14, minHeight: 52 }}>
              <Pressable onPress={() => toggle(it.key)} hitSlop={6} className="active:opacity-60">
                <CircleCheck checked={checks[it.key]} />
              </Pressable>
              <Pressable
                onPress={() => toggle(it.key)}
                className="flex-1 flex-row items-center active:opacity-60"
                style={{ gap: 7 }}>
                <AppText
                  variant="caption"
                  className={it.required ? 'text-text-secondary' : 'text-text-tertiary'}>
                  {it.required ? '필수' : '선택'}
                </AppText>
                <AppText variant="body" className="text-text-primary flex-1">
                  {it.label}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('TermsDetail', { kind: it.kind })}
                hitSlop={10}
                className="pl-sm active:opacity-50">
                <Icon name="chevron-right" size={18} color={c['text-tertiary']} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 하단 CTA */}
      <View className="px-xl pt-md">
        <Button
          title="동의하고 계속"
          size="lg"
          onPress={onSubmit}
          disabled={!requiredDone}
          loading={submit.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
