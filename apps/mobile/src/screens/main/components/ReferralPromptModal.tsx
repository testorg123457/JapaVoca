/**
 * ReferralPromptModal — 첫 가입 직후 1회 뜨는 추천인 코드 입력 모달.
 *
 * 놓쳐도 손해가 없도록 설계했다: 닫아도 가입 후 기한(서버 REFERRAL_REDEEM_WINDOW) 안에는
 * '친구 초대' 화면에서 그대로 입력할 수 있다. 모달은 알림 역할이지 유일한 기회가 아니다.
 * 그래서 '한 번 띄웠는지'만 로컬에 기록하고, 자격 판단(기한·1회·게스트)은 서버에 맡긴다.
 */
import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import type { AxiosError } from 'axios';

import { AppText, Button, Icon } from '../../../components';
import { useThemeColors } from '../../../theme/ThemeProvider';
import { radius } from '../../../theme/tokens';
import { useRedeemReferral, type ReferralStatus } from '../../../api/hooks';

export function ReferralPromptModal({
  visible,
  status,
  onClose,
}: {
  visible: boolean;
  status: ReferralStatus;
  onClose: () => void;
}): React.JSX.Element {
  const c = useThemeColors();
  const redeem = useRedeemReferral();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const reward = status.invitee_reward;

  const submit = () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setError('코드를 입력해주세요.');
      return;
    }
    setError('');
    redeem.mutate(code, {
      onSuccess: onClose,
      onError: (err) => {
        const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
        setError(detail ?? '잠시 후 다시 시도해주세요.');
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}>
        <View style={{
          borderRadius: radius['2xl'],
          backgroundColor: c['bg-primary'],
          padding: 24,
          gap: 18,
        }}>
          <View style={{ gap: 6 }}>
            <View className="flex-row items-end" style={{ gap: 6 }}>
              <AppText variant="hero" style={{ color: c.brand, fontSize: 36 }}>
                {reward.toLocaleString()}
              </AppText>
              <AppText variant="title" style={{ color: c.brand, marginBottom: 5 }}>캐시</AppText>
            </View>
            <AppText variant="title" className="text-text-primary">
              추천인 코드가 있나요?
            </AppText>
            <AppText variant="caption" className="text-text-secondary">
              친구 코드를 입력하면 바로 {reward.toLocaleString()} 캐시를 받아요.
            </AppText>
          </View>

          <View style={{ gap: 8 }}>
            <TextInput
              value={input}
              onChangeText={(t) => { setInput(t.toUpperCase()); setError(''); }}
              placeholder="코드 8자리"
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
            {error ? (
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Icon name="alert" size={13} color={c.danger} />
                <AppText variant="caption" style={{ color: c.danger }}>{error}</AppText>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 10 }}>
            <Button
              title={`${reward.toLocaleString()} 캐시 받기`}
              onPress={submit}
              loading={redeem.isPending}
            />
            {/* 닫아도 기한 안에는 '친구 초대'에서 입력할 수 있다 — 그 사실을 명시한다. */}
            <Pressable onPress={onClose} hitSlop={8} className="items-center py-sm active:opacity-60">
              <AppText variant="label" style={{ color: c['text-tertiary'] }}>
                나중에 입력할게요
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
