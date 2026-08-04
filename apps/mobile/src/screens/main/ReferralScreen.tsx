/**
 * ReferralScreen — 친구 초대.
 *
 * 캐시가 걸린 리워드 기능인데 예전엔 **계정 설정 최상단**에 얹혀 있었다. 계정과 무관하므로
 * 제 화면으로 뺐다(설정 > 리워드 > 친구 초대). 홈 배너도 이 화면으로 온다.
 *
 * 내용은 `ReferralSection` 그대로 — 내 코드 칩(탭하면 복사) · 코드 공유 · 추천인 코드 입력 진입.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader } from '../../components';
import { ReferralSection } from './components/ReferralSection';

export default function ReferralScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="친구 초대" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        <ReferralSection />
      </ScrollView>
    </View>
  );
}
