/** 약관 전문(플레이스홀더). 라우트 파라미터 kind 로 어떤 약관인지 결정. */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText } from '../../components';
import { TERMS_CONTENT } from './termsContent';
import type { TermKind } from '../../navigation/types';

/** 스택 무관 — 온보딩/메인(계정 설정) 양쪽 스택에서 재사용(route.params.kind만 사용). */
export default function TermsDetailScreen({
  route,
}: {
  route: { params: { kind: TermKind } };
}): React.JSX.Element {
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
