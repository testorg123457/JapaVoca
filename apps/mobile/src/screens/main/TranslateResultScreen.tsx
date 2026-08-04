/**
 * TranslateResultScreen — 번역 결과.
 *
 * uri를 받아 서버에 이미지를 올려 OCR+번역({original, korean})을 받는다.
 * 원문(일본어)은 표본처럼 크게 두고 수정 가능하며, 고친 뒤 "다시 번역"으로
 * 텍스트 재번역한다. 원문 → (연결 칩) → 번역 순서로 흐름을 보여준다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

import { AppHeader, AppText, Button, Icon, PressableScale, useToast } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { hairline, radius, shadowStyle } from '../../theme/tokens';
import { translateImage, translateText } from '../../api/translate';
import {
  classifyTranslateError,
  errorMessage, toastText,
  type TransErrorKind,
} from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

type Status = 'uploading' | 'translating' | 'done' | 'error';

const EYEBROW = { fontSize: 12, letterSpacing: 1.5 } as const;

export default function TranslateResultScreen({
  route,
  navigation,
}: MainStackScreenProps<'TranslateResult'>): React.JSX.Element {
  const c = useThemeColors();
  const { showToast } = useToast();
  const { uri } = route.params;
  const [status, setStatus] = useState<Status>('uploading');
  const [source, setSource] = useState('');
  const [result, setResult] = useState('');
  const [translatedSource, setTranslatedSource] = useState('');
  const [errKind, setErrKind] = useState<TransErrorKind>('unknown');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { original, korean } = await translateImage(uri);
        if (!alive) {
          return;
        }
        if (!original.trim()) {
          setErrKind('no-text');
          setStatus('error');
          return;
        }
        setSource(original);
        setResult(korean);
        setTranslatedSource(original);
        setStatus('done');
      } catch (e) {
        if (alive) {
          setErrKind(classifyTranslateError(e));
          setStatus('error');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [uri]);

  const retranslate = useCallback(async () => {
    const text = source.trim();
    setStatus('translating');
    try {
      const { korean } = await translateText(text);
      if (!mountedRef.current) {
        return;
      }
      setResult(korean);
      setTranslatedSource(text);
      setStatus('done');
    } catch (e) {
      if (!mountedRef.current) {
        return;
      }
      // 재번역 실패는 화면을 갈아엎지 않는다 — 기존 결과·편집 유지 + 토스트로만 알림.
      setStatus('done');
      showToast(toastText(classifyTranslateError(e)), 'error');
    }
  }, [source, showToast]);

  const busy = status === 'uploading' || status === 'translating';
  const edited = source.trim().length > 0 && source.trim() !== translatedSource;

  if (status === 'error') {
    const msg = errorMessage(errKind);
    return (
      <View className="flex-1 bg-bg-secondary">
        <AppHeader title="번역 결과" showBack />
        <View className="flex-1 items-center px-xl" style={{ paddingTop: 96, gap: 14 }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 64, height: 64, backgroundColor: c['danger-subtle'] }}>
            <Icon name="alert" size={30} color={c.danger} />
          </View>
          <AppText variant="title" className="text-text-primary" style={{ textAlign: 'center' }}>
            {msg.title}
          </AppText>
          <AppText
            variant="body"
            className="text-text-secondary"
            style={{ textAlign: 'center', lineHeight: 22 }}>
            {msg.message}
          </AppText>
          <View style={{ width: '100%', marginTop: 8 }}>
            <Button title="다시 촬영" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="번역 결과" showBack />
      <ScrollView contentContainerClassName="px-xl" style={{ paddingTop: 12 }}>
        {status === 'uploading' ? (
          <View className="items-center" style={{ paddingTop: 88, gap: 12 }}>
            <ActivityIndicator color={c.brand} />
            <AppText variant="body" className="text-text-tertiary">
              글자를 읽는 중…
            </AppText>
          </View>
        ) : (
          <View
            className="bg-bg-primary"
            style={[{ borderRadius: radius.lg, padding: 20 }, shadowStyle('xs')]}>
            {/* 일본어 (원문, 편집 가능) */}
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <AppText variant="caption" style={{ ...EYEBROW, color: c['text-tertiary'] }}>
                일본어
              </AppText>
              <Icon name="pencil" size={13} color={c['text-tertiary']} />
              <View className="flex-1" />
              {edited ? (
                <PressableScale onPress={retranslate} disabled={busy} pressedScale={0.96}>
                  <View
                    className="rounded-full"
                    style={{ backgroundColor: c['brand-subtle'], paddingHorizontal: 12, paddingVertical: 6 }}>
                    <AppText variant="label" style={{ color: c.brand }}>
                      다시 번역
                    </AppText>
                  </View>
                </PressableScale>
              ) : null}
            </View>
            <TextInput
              value={source}
              onChangeText={setSource}
              multiline
              editable={!busy}
              placeholder="인식된 일본어"
              placeholderTextColor={c['text-tertiary']}
              style={{
                color: c['text-primary'],
                fontSize: 26,
                lineHeight: 36,
                letterSpacing: 0.2,
                padding: 0,
                marginTop: 10,
              }}
            />

            {/* 연결 — 원문이 번역으로 흐른다 */}
            <View className="items-center justify-center" style={{ height: 34, marginVertical: 8 }}>
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: hairline,
                  backgroundColor: c['border-tertiary'],
                }}
              />
              <View
                className="items-center justify-center rounded-full bg-bg-primary"
                style={{ width: 34, height: 34, borderWidth: hairline, borderColor: c['border-secondary'] }}>
                <Icon name="chevron-down" size={18} color={c.brand} />
              </View>
            </View>

            {/* 한국어 (번역) */}
            <AppText variant="caption" style={{ ...EYEBROW, color: c['text-tertiary'] }}>
              한국어
            </AppText>
            {status === 'translating' ? (
              <View className="flex-row items-center" style={{ gap: 8, marginTop: 12, paddingVertical: 4 }}>
                <ActivityIndicator color={c.brand} />
                <AppText variant="body" className="text-text-tertiary">
                  번역하는 중…
                </AppText>
              </View>
            ) : (
              <AppText
                className="text-text-primary"
                style={{ fontSize: 19, lineHeight: 28, marginTop: 10 }}>
                {result}
              </AppText>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
