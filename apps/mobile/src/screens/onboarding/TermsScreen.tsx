/**
 * 약관 동의 — 토스풍 레이아웃(우리 디자인 시스템: tokens + 공용 컴포넌트).
 *
 * 두 가지 모드:
 * 1. pending 모드 (pendingAuth 있음) — 유저 미생성 상태. 동의 내용을 MMKV에 저장하고
 *    Permissions로 넘어간다. 서버 호출 없음.
 * 2. 일반 모드 (이미 로그인됨) — 서버에 바로 POST /api/auth/consent/.
 *
 * 필수(이용약관·개인정보·휴대폰번호[게스트 제외])를 모두 체크해야 "동의하고 계속" 활성.
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
import { useAuth } from '../../store/AuthContext';
import { setPendingConsent } from '../../store/onboarding';
import type { OnboardingStackScreenProps, TermKind } from '../../navigation/types';

type Item = { key: keyof ConsentChecks; kind: TermKind; label: string; required: boolean };

const ALL_ITEMS: Item[] = [
  { key: 'terms', kind: 'terms', label: '이용약관 동의', required: true },
  { key: 'privacy', kind: 'privacy', label: '개인정보 수집·이용 동의', required: true },
  { key: 'phone', kind: 'phone', label: '휴대폰번호 데이터 동의', required: true },
  { key: 'marketing', kind: 'marketing', label: '마케팅 정보 수신 동의', required: false },
];

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
  const { pendingAuth } = useAuth();
  const isPendingMode = pendingAuth !== null;
  const me = useMe();
  const submit = useSubmitConsent();

  const isGuest = isPendingMode
    ? pendingAuth?.method === 'guest'
    : (me.data?.is_guest ?? false);

  const [checks, setChecks] = useState<ConsentChecks>({
    terms: false,
    privacy: false,
    phone: false,
    marketing: false,
  });

  // 일반 모드에서는 me 로딩 전에 게스트 여부를 알 수 없으므로 대기.
  if (!isPendingMode && !me.data) {
    return (
      <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={c.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const items = ALL_ITEMS.filter((it) => it.key !== 'phone' || !isGuest);
  const requiredDone = isRequiredConsentComplete(checks, isGuest);
  const allChecked = items.every((it) => checks[it.key]);

  function toggle(key: keyof ConsentChecks) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAll() {
    const next = !allChecked;
    setChecks({ terms: next, privacy: next, phone: isGuest ? false : next, marketing: next });
  }

  async function onSubmit() {
    if (!requiredDone) {
      return;
    }

    if (isPendingMode) {
      setPendingConsent({
        marketing_agreed: checks.marketing,
        phone_data_agreed: isGuest ? false : checks.phone,
      });
      navigation.navigate('Permissions');
      return;
    }

    if (submit.isPending) {
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
      // 제출 실패 — 버튼이 다시 활성화되며 재시도 가능.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-secondary" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerClassName="pb-2xl" showsVerticalScrollIndicator={false}>
        <View className="px-2xl pt-3xl pb-2xl gap-sm">
          <AppText variant="display" className="text-text-primary" style={{ lineHeight: 38 }}>
            약관에 동의하고{'\n'}시작해요
          </AppText>
          <AppText variant="body" className="text-text-secondary">
            서비스 이용을 위해 동의가 필요해요.
          </AppText>
        </View>

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

        <View className="h-px bg-border-tertiary mx-2xl mt-xl mb-xs" />

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

      <View className="px-xl pt-md">
        <Button
          title="동의하고 계속"
          size="lg"
          onPress={onSubmit}
          disabled={!requiredDone}
          loading={!isPendingMode && submit.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
