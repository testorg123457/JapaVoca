/** 약관 전문(플레이스홀더). 라우트 파라미터 kind 로 어떤 약관인지 결정. */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText } from '../../components';
import { TERMS_CONTENT } from './termsContent';
import type { OnboardingStackScreenProps } from '../../navigation/types';

export default function TermsDetailScreen({
  route,
}: OnboardingStackScreenProps<'TermsDetail'>): React.JSX.Element {
  const content = TERMS_CONTENT[route.params.kind];
  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title={content.title} showBack />
      <ScrollView contentContainerClassName="px-xl py-xl gap-md" showsVerticalScrollIndicator={false}>
        <AppText variant="body" className="text-text-secondary" style={{ lineHeight: 22 }}>
          {content.body}
        </AppText>
      </ScrollView>
    </View>
  );
}
