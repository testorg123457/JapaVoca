/**
 * TranslateResultScreen — 번역 결과.
 *
 * uri를 받아 서버에 이미지를 올려 OCR+번역({original, korean})을 받는다.
 * 원문은 수정 가능하며, 고친 뒤 "다시 번역"으로 텍스트 재번역한다.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

import { AppHeader, AppText, Button } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { translateImage, translateText } from '../../api/translate';
import {
  classifyTranslateError,
  errorMessage,
  type TransErrorKind,
} from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

type Status = 'uploading' | 'translating' | 'done' | 'error';

export default function TranslateResultScreen({
  route,
  navigation,
}: MainStackScreenProps<'TranslateResult'>): React.JSX.Element {
  const c = useThemeColors();
  const { uri } = route.params;
  const [status, setStatus] = useState<Status>('uploading');
  const [source, setSource] = useState('');
  const [result, setResult] = useState('');
  const [errKind, setErrKind] = useState<TransErrorKind>('unknown');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { original, korean } = await translateImage(uri);
        if (!alive) {
          return;
        }
        if (!original) {
          setErrKind('no-text');
          setStatus('error');
          return;
        }
        setSource(original);
        setResult(korean);
        setStatus('done');
      } catch (e) {
        if (!alive) {
          return;
        }
        setErrKind(classifyTranslateError(e));
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [uri]);

  const retranslate = useCallback(async () => {
    setStatus('translating');
    try {
      const { korean } = await translateText(source);
      setResult(korean);
      setStatus('done');
    } catch (e) {
      setErrKind(classifyTranslateError(e));
      setStatus('error');
    }
  }, [source]);

  const busy = status === 'uploading' || status === 'translating';

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="번역 결과" showBack />
      <ScrollView contentContainerClassName="px-xl py-lg" style={{ gap: 16 }}>
        {status === 'error' ? (
          <View style={{ gap: 12, paddingVertical: 24 }}>
            <AppText variant="title" className="text-text-primary">
              {errorMessage(errKind).title}
            </AppText>
            <AppText variant="body" className="text-text-secondary">
              {errorMessage(errKind).message}
            </AppText>
            <Button title="다시 촬영" onPress={() => navigation.goBack()} />
          </View>
        ) : (
          <>
            <View
              style={{
                backgroundColor: c['bg-primary'],
                borderRadius: radius.lg,
                padding: 16,
                gap: 10,
              }}>
              <AppText variant="label" className="text-text-tertiary">
                원문 (일본어)
              </AppText>
              <TextInput
                value={source}
                onChangeText={setSource}
                multiline
                editable={!busy}
                placeholder="인식된 일본어"
                placeholderTextColor={c['text-tertiary']}
                style={{ color: c['text-primary'], fontSize: 18, lineHeight: 26, padding: 0 }}
              />
              <Button
                title="다시 번역"
                variant="soft"
                size="sm"
                onPress={retranslate}
                disabled={busy || !source.trim()}
              />
            </View>

            <View
              style={{
                backgroundColor: c['bg-primary'],
                borderRadius: radius.lg,
                padding: 16,
                gap: 10,
                minHeight: 120,
              }}>
              <AppText variant="label" className="text-text-tertiary">
                번역 (한국어)
              </AppText>
              {busy ? (
                <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color={c.brand} />
                  <AppText variant="caption" className="text-text-tertiary">
                    {status === 'uploading' ? '읽는 중…' : '번역하는 중…'}
                  </AppText>
                </View>
              ) : (
                <AppText
                  variant="body"
                  className="text-text-primary"
                  style={{ fontSize: 17, lineHeight: 25 }}>
                  {result}
                </AppText>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
