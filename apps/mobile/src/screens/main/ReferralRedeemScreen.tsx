/**
 * ReferralRedeemScreen — 추천인 코드 입력(평생 1회).
 *
 * 계정 설정에서 '추천인 코드 입력' 행을 누르면 열린다. 내 코드 공유는 계정 설정에 남기고,
 * 이 화면은 '친구 코드를 넣고 보상 받기' 한 가지 일만 한다.
 * 자격 판단(게스트/기한/1회)은 서버 status(can_redeem 등)를 그대로 따른다.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AxiosError } from 'axios';

import { AppHeader, AppText, Button, Coin, Icon, useToast } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { useReferral, useRedeemReferral } from '../../api/hooks';

export default function ReferralRedeemScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const referral = useReferral();
  const redeem = useRedeemReferral();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const data = referral.data;
  const reward = data?.invitee_reward ?? 300;

  const submit = () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setError('코드를 입력해주세요.');
      return;
    }
    setError('');
    redeem.mutate(code, {
      onSuccess: () => {
        showToast(`${reward.toLocaleString()} 캐시를 받았어요.`);
        navigation.goBack();
      },
      onError: (err) => {
        const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
        setError(detail ?? '잠시 후 다시 시도해주세요.');
      },
    });
  };

  // 입력할 수 없는 상태(이미 입력함/기한 지남/게스트)는 이유만 담백하게 보여준다.
  const blockedReason = !data
    ? null
    : data.used_code
      ? '이미 추천인을 입력했어요.'
      : data.is_guest
        ? '구글·카카오 계정을 연결하면 입력할 수 있어요.'
        : !data.can_redeem
          ? '추천인 입력 기간이 지났어요.'
          : null;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="추천인 코드 입력" showBack />

      <View className="gap-2xl px-xl py-2xl">
        {/* 리드 — 보상 금액을 한 줄로. 큰 히어로 대신 문장으로 말한다. */}
        <View className="gap-sm">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Coin size={20} />
            <AppText variant="title" className="text-text-primary">
              친구 코드로 {reward.toLocaleString()} 캐시 받기
            </AppText>
          </View>
          <AppText variant="caption" className="text-text-secondary">
            친구에게 받은 코드를 입력하면 바로 적립돼요. 한 번만 입력할 수 있어요.
          </AppText>
        </View>

        {blockedReason ? (
          <View
            className="flex-row items-center p-lg"
            style={{ gap: 8, backgroundColor: c['bg-primary'], borderRadius: radius.lg }}>
            <Icon name="alert" size={16} color={c['text-tertiary']} />
            <AppText variant="caption" className="text-text-secondary">
              {blockedReason}
            </AppText>
          </View>
        ) : (
          <View className="gap-md">
            <TextInput
              value={input}
              onChangeText={(t) => { setInput(t.toUpperCase()); setError(''); }}
              placeholder="친구의 코드"
              placeholderTextColor={c['text-tertiary']}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={12}
              style={{
                borderRadius: radius.md,
                backgroundColor: c['bg-primary'],
                borderWidth: 1,
                borderColor: error ? c.danger : c['border-secondary'],
                paddingHorizontal: 16,
                height: 56,
                color: c['text-primary'],
                fontSize: 20,
                letterSpacing: 4,
                textAlign: 'center',
                fontWeight: '700',
              }}
            />
            {!!error && (
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Icon name="alert" size={13} color={c.danger} />
                <AppText variant="caption" style={{ color: c.danger }}>{error}</AppText>
              </View>
            )}
            <Button
              title={`${reward.toLocaleString()} 캐시 받기`}
              onPress={submit}
              loading={redeem.isPending}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
