/**
 * ReferralSection — 계정 설정 안의 친구 초대 블록(컴팩트).
 *
 * 설정 화면답게 절제한다: 큰 그라데이션 히어로·실적 타일을 쓰지 않고,
 *  - 내 코드를 '탭하면 복사되는 코드 칩'으로 보여주고(시그니처),
 *  - 코드 공유 버튼,
 *  - 친구 코드 입력은 여기서 하지 않고 별도 화면(ReferralRedeem)으로 넘긴다.
 *
 * 자격 판단(게스트/기한/1회)은 서버 status 를 그대로 따른다.
 */
import React, { useRef, useState } from 'react';
import { Clipboard, Share, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppText, Button, Icon, ListRow, PressableScale } from '../../../components';
import { useThemeColors } from '../../../theme/ThemeProvider';
import { radius } from '../../../theme/tokens';
import type { MainStackScreenProps } from '../../../navigation/types';
import { useReferral } from '../../../api/hooks';

export function ReferralSection(): React.JSX.Element | null {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'AccountSettings'>['navigation']>();
  const referral = useReferral();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data = referral.data;
  if (!data) { return null; }

  const reward = data.invitee_reward;

  // 게스트는 코드 발급 자체가 안 된다 — 계정 연결 유도만 한 줄.
  if (data.is_guest) {
    return (
      <View className="px-xl">
        <AppText variant="label" className="mb-md text-text-secondary">친구 초대</AppText>
        <View className="p-lg" style={{ backgroundColor: c['bg-primary'], borderRadius: radius.lg }}>
          <AppText variant="caption" className="text-text-secondary">
            계정을 연결하면 내 추천 코드가 생겨요. 친구가 입력하면 둘 다 {reward.toLocaleString()} 캐시를 받아요.
          </AppText>
        </View>
      </View>
    );
  }

  const copyCode = () => {
    if (!data.code) { return; }
    Clipboard.setString(data.code);
    setCopied(true);
    if (copyTimer.current) { clearTimeout(copyTimer.current); }
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const shareCode = () => {
    if (!data.code) { return; }
    Share.share({
      message: `일본어 한자 보카에서 같이 공부해요! 추천 코드 ${data.code} 를 입력하면 ${reward} 캐시를 받아요.`,
    }).catch(() => {});
  };

  return (
    <View className="gap-md">
      <AppText variant="label" className="ml-xl text-text-secondary">친구 초대</AppText>

      <View className="mx-xl gap-md">
        {/* 시그니처 — 탭하면 복사되는 코드 칩. 복사 후 상태가 바뀐다(촉각적 피드백). */}
        <PressableScale onPress={copyCode} pressedScale={0.98}>
          <View
            className="flex-row items-center justify-between p-lg"
            style={{
              backgroundColor: c['bg-primary'],
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: copied ? c.brand : c['border-secondary'],
            }}>
            <View style={{ gap: 3 }}>
              <AppText variant="micro" className="text-text-tertiary">내 추천 코드</AppText>
              <AppText
                variant="title"
                style={{ color: c['text-primary'], letterSpacing: 4, fontSize: 22 }}>
                {data.code ?? '—'}
              </AppText>
            </View>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <Icon
                name={copied ? 'check-circle' : 'document'}
                size={16}
                color={copied ? c.brand : c['text-secondary']}
                strokeWidth={copied ? 2 : 1.6}
              />
              <AppText
                variant="label"
                style={{ color: copied ? c.brand : c['text-secondary'], fontWeight: '700' }}>
                {copied ? '복사됨' : '복사'}
              </AppText>
            </View>
          </View>
        </PressableScale>

        <AppText variant="caption" className="text-text-tertiary">
          친구가 이 코드를 입력하면 둘 다 {reward.toLocaleString()} 캐시를 받아요.
        </AppText>

        <Button title="코드 공유" variant="soft" leftIcon="mail" onPress={shareCode} />
      </View>

      {/* 친구 코드 입력 — 별도 화면으로. 이미 입력했으면 완료 표시만. */}
      <ListRow
        leftIcon="gift"
        title="추천인 코드 입력"
        subtitle={data.used_code ? undefined : '친구 코드를 넣고 캐시 받기'}
        value={data.used_code ? '입력 완료' : undefined}
        showChevron={!data.used_code}
        onPress={data.used_code ? undefined : () => navigation.navigate('ReferralRedeem')}
        last
      />
    </View>
  );
}
