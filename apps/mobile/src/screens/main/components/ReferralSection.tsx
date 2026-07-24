/**
 * ReferralSection — 계정 설정 상단에 얹는 친구 초대 영역.
 *
 * 구성: ① 브랜드 그라데이션 히어로(문구 + 내 코드 + 복사·공유)
 *       ② 초대 실적  ③ 추천인 코드 입력(평생 1회 · 기한 내에만)
 *
 * 자격 판단(게스트/기한/1회)은 전부 서버가 준 status를 따른다. 이 컴포넌트는 표시만.
 * ⚠️ 디자인 시스템 준수 — 라운드/여백/색은 토큰·공용 컴포넌트만 사용.
 */
import React, { useState } from 'react';
import { Alert, Clipboard, Share, TextInput, View } from 'react-native';
import type { AxiosError } from 'axios';

import { AppText, Button, Card, Coin, Gradient, Icon, PressableScale } from '../../../components';
import { useThemeColors } from '../../../theme/ThemeProvider';
import { gradients, radius } from '../../../theme/tokens';
import { useReferral, useRedeemReferral } from '../../../api/hooks';

export function ReferralSection(): React.JSX.Element | null {
  const c = useThemeColors();
  const referral = useReferral();
  const redeem = useRedeemReferral();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const data = referral.data;
  if (!data) { return null; }

  const nextReward = data.next_reward;
  const inviteeReward = data.invitee_reward;

  // 게스트는 코드 발급 자체가 안 된다 — 계정 연결로 유도.
  if (data.is_guest) {
    return (
      <Card variant="flat" className="mx-xl">
        <View className="gap-xs">
          <AppText variant="subheading" className="text-text-primary">
            친구 초대하고 캐시 받기
          </AppText>
          <AppText variant="caption" className="text-text-secondary">
            구글·카카오 계정을 연결하면 친구 초대 보상을 받을 수 있어요.
          </AppText>
        </View>
      </Card>
    );
  }

  const copyCode = () => {
    if (!data.code) { return; }
    Clipboard.setString(data.code);
    Alert.alert('복사했어요', '친구에게 코드를 보내주세요.');
  };

  const shareCode = () => {
    if (!data.code) { return; }
    Share.share({
      message: `일본어 한자 보카에서 같이 공부해요! 추천 코드 ${data.code} 를 입력하면 ${inviteeReward} 캐시를 받아요.`,
    }).catch(() => {});
  };

  const submit = () => {
    const code = input.trim().toUpperCase();
    if (!code) { setError('코드를 입력해주세요.'); return; }
    setError('');
    redeem.mutate(code, {
      onSuccess: () => {
        setInput('');
        Alert.alert('적립 완료', `추천인 보상 ${inviteeReward.toLocaleString()} 캐시를 받았어요.`);
      },
      onError: (err) => {
        const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
        setError(detail ?? '잠시 후 다시 시도해주세요.');
      },
    });
  };

  return (
    <View className="mx-xl gap-lg">
      {/* ① 히어로 — 브랜드 그라데이션 위에 문구 + 내 코드 */}
      <View style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
        <Gradient colors={gradients.brand} direction="diagonal" />
        <View className="gap-lg p-xl">
          <View className="gap-xs">
            <AppText variant="display" style={{ color: c['on-brand'] }}>
              친구를 초대하고{'\n'}캐시를 받으세요!
            </AppText>
            {nextReward > 0 && (
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Coin size={18} />
                <AppText variant="subheading" style={{ color: c['on-brand'] }}>
                  초대할 때마다 {nextReward.toLocaleString()} 캐시
                </AppText>
              </View>
            )}
          </View>

          {/* 내 코드 — 반투명 흰 면 위에 크게 */}
          <View
            className="flex-row items-center justify-between p-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.md }}>
            <View className="gap-xs">
              <AppText variant="micro" style={{ color: 'rgba(255,255,255,0.8)' }}>
                내 추천 코드
              </AppText>
              <AppText
                variant="title"
                style={{ color: c['on-brand'], letterSpacing: 4, fontSize: 24 }}>
                {data.code ?? '—'}
              </AppText>
            </View>
            <PressableScale
              onPress={copyCode}
              className="flex-row items-center"
              style={{
                gap: 5, backgroundColor: c['on-brand'], borderRadius: radius.sm,
                paddingHorizontal: 14, paddingVertical: 9,
              }}>
              <Icon name="document" size={15} color={c.brand} />
              <AppText variant="label" style={{ color: c.brand, fontWeight: '700' }}>복사</AppText>
            </PressableScale>
          </View>

          <Button title="친구에게 공유하기" variant="soft" onPress={shareCode} />
        </View>
      </View>

      {/* ② 실적 */}
      <View className="flex-row" style={{ gap: 12 }}>
        <Card variant="flat" className="flex-1">
          <View className="items-center gap-xs">
            <AppText variant="caption" className="text-text-tertiary">초대한 친구</AppText>
            <AppText variant="title" className="text-text-primary">{data.invited_count}명</AppText>
          </View>
        </Card>
        <Card variant="flat" className="flex-1">
          <View className="items-center gap-xs">
            <AppText variant="caption" className="text-text-tertiary">받은 캐시</AppText>
            <AppText variant="title" style={{ color: c.brand }}>
              {data.earned_cash.toLocaleString()}
            </AppText>
          </View>
        </Card>
      </View>

      {/* ③ 추천인 코드 입력 — 평생 1회 */}
      <Card variant="flat">
        <View className="gap-md">
          <View className="gap-xs">
            <AppText variant="subheading" className="text-text-primary">
              친구가 추천인 코드를 적으면 {inviteeReward.toLocaleString()} 캐시를 받아요!
            </AppText>
            <AppText variant="caption" className="text-text-tertiary">
              추천인 코드는 한 번만 입력할 수 있어요.
            </AppText>
          </View>

          {data.used_code ? (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Icon name="check-circle" size={18} color={c.brand} strokeWidth={2} />
              <AppText variant="caption" className="text-text-secondary">
                이미 추천인을 입력했어요.
              </AppText>
            </View>
          ) : !data.can_redeem ? (
            <AppText variant="caption" className="text-text-tertiary">
              추천인 입력 기간이 지났어요.
            </AppText>
          ) : (
            <>
              <TextInput
                value={input}
                onChangeText={(t) => { setInput(t.toUpperCase()); setError(''); }}
                placeholder="친구의 코드"
                placeholderTextColor={c['text-tertiary']}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                style={{
                  borderRadius: radius.md,
                  backgroundColor: c['bg-secondary'],
                  borderWidth: 1,
                  borderColor: error ? c.danger : c['border-secondary'],
                  paddingHorizontal: 16,
                  height: 52,
                  color: c['text-primary'],
                  fontSize: 17,
                  letterSpacing: 3,
                }}
              />
              {!!error && (
                <View className="flex-row items-center" style={{ gap: 5 }}>
                  <Icon name="alert" size={13} color={c.danger} />
                  <AppText variant="caption" style={{ color: c.danger }}>{error}</AppText>
                </View>
              )}
              <Button
                title={`${inviteeReward.toLocaleString()} 캐시 받기`}
                onPress={submit}
                loading={redeem.isPending}
              />
            </>
          )}
        </View>
      </Card>
    </View>
  );
}
