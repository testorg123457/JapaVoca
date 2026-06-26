/**
 * 문의하기 — "보내기 중심" 디자인(정제 톤).
 *
 * 화면의 주인공은 상단 입력창(컴포즈). 문의를 보내는 것으로 흐름이 끝난다.
 * 답변은 전제하지 않는다 — 운영자가 답을 남기면 보낸 문의 카드 안에 조용히 붙고,
 * 답이 없으면 그냥 내가 보낸 글로만 남는다(‘대기/준비 중’ 같은 표현 없음).
 *
 * 디자인: 과한 라운드 지양(반경 12). 1px 보더 + 옅은 배경으로 면을 정리한 실무 톤.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { AppHeader, AppText, Icon, PressableScale } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  useDeleteInquiry,
  useInquiries,
  useMarkAllInquiriesRead,
  usePostInquiry,
  useUnreadInquiryCount,
  type Inquiry,
} from '../../api/hooks';

const MAX_LEN = 2000;
const RADIUS = 12;

function formatDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000); // KST = UTC+9
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}. ${m}. ${day}`;
}

/** 보낸 문의 1건. 답변이 있으면만 답변 블록을 붙인다(없으면 표시 없음). */
function SentCard({
  inquiry,
  onDelete,
}: {
  inquiry: Inquiry;
  onDelete: () => void;
}): React.JSX.Element {
  const c = useThemeColors();
  const hasAnswer = inquiry.answer !== null && inquiry.answer !== '';

  return (
    <View
      style={{
        backgroundColor: c['bg-primary'],
        borderRadius: RADIUS,
        borderWidth: 1,
        borderColor: c['border-secondary'],
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
      }}>
      <View className="flex-row items-center justify-between">
        <AppText variant="caption" className="text-text-tertiary">
          {formatDate(inquiry.created_at)}
        </AppText>
        <Pressable onPress={onDelete} hitSlop={10}>
          <AppText variant="caption" className="text-text-tertiary">
            삭제
          </AppText>
        </Pressable>
      </View>

      <AppText variant="body" className="mt-sm text-text-primary" style={{ lineHeight: 22 }}>
        {inquiry.content}
      </AppText>

      {hasAnswer ? (
        <View
          className="mt-md pt-md"
          style={{ borderTopWidth: 1, borderTopColor: c['border-tertiary'] }}>
          <View className="flex-row items-center gap-xs">
            <Icon name="mail" size={13} color={c.brand} />
            <AppText variant="micro" className="text-brand" style={{ fontWeight: '700', letterSpacing: 0.3 }}>
              답변
            </AppText>
          </View>
          <AppText variant="body" className="mt-xs text-text-secondary" style={{ lineHeight: 22 }}>
            {inquiry.answer}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export default function InquiryScreen(): React.JSX.Element {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const inquiries = useInquiries();
  const postInquiry = usePostInquiry();
  const deleteInquiry = useDeleteInquiry();
  const unreadCount = useUnreadInquiryCount();
  const markAllRead = useMarkAllInquiriesRead();

  useEffect(() => {
    markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        unreadCount.refetch();
        inquiries.refetch();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || postInquiry.isPending) return;
    try {
      await postInquiry.mutateAsync(trimmed);
      if (!mountedRef.current) return;
      setText('');
      showToast('문의를 보냈어요. 감사합니다!');
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err?.response?.status === 429) {
        showToast('오늘 문의 한도에 도달했어요.');
      } else {
        showToast('문의 전송에 실패했어요. 다시 시도해주세요.');
      }
    }
  }

  function confirmDelete(id: number) {
    Alert.alert('문의 삭제', '이 문의를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deleteInquiry.mutate(id, {
            onError: () => showToast('삭제에 실패했어요. 다시 시도해주세요.'),
          }),
      },
    ]);
  }

  const canSend = text.trim().length > 0 && !postInquiry.isPending;
  const list = inquiries.data ?? [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c['bg-tertiary'] }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="문의하기" showBack />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* 리드 — 보내기 유도(답변 기대 X) */}
        <AppText variant="heading" className="text-text-primary" style={{ lineHeight: 26, letterSpacing: -0.3 }}>
          {'궁금한 점이나 의견을\n편하게 보내주세요'}
        </AppText>
        <AppText variant="caption" className="mt-sm text-text-tertiary" style={{ lineHeight: 19 }}>
          버그·제안·불편한 점 무엇이든 좋아요. 확인 후 필요한 경우 답변을 남겨 드려요.
        </AppText>

        {/* 컴포즈(주인공) */}
        <View
          style={{
            backgroundColor: c['bg-primary'],
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: c['border-secondary'],
            padding: 16,
            marginTop: 18,
            marginBottom: 24,
          }}>
          <TextInput
            className="text-text-primary"
            style={{ minHeight: 92, fontSize: 15, lineHeight: 22, textAlignVertical: 'top', padding: 0 }}
            placeholder="무엇이든 편하게 적어주세요."
            placeholderTextColor={c['text-tertiary']}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX_LEN}
          />
          <View
            className="mt-md flex-row items-center justify-between pt-md"
            style={{ borderTopWidth: 1, borderTopColor: c['border-tertiary'] }}>
            <AppText variant="caption" className="text-text-tertiary">
              {text.length} / {MAX_LEN}
            </AppText>
            <PressableScale onPress={handleSend} disabled={!canSend}>
              <View
                className="flex-row items-center"
                style={{
                  gap: 6,
                  backgroundColor: c.brand,
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  opacity: canSend ? 1 : 0.4,
                }}>
                <AppText variant="label" style={{ color: c['on-brand'], fontWeight: '700' }}>
                  보내기
                </AppText>
                <Icon name="chevron-right" size={16} color={c['on-brand']} strokeWidth={2.4} />
              </View>
            </PressableScale>
          </View>
        </View>

        {/* 보낸 문의 — 있을 때만. 답변은 온 것만 카드 안에 붙음 */}
        {list.length > 0 ? (
          <>
            <AppText
              variant="micro"
              className="mb-md ml-xs text-text-tertiary"
              style={{ fontWeight: '700', letterSpacing: 0.5 }}>
              보낸 문의
            </AppText>
            {list.map((item) => (
              <SentCard key={item.id} inquiry={item} onDelete={() => confirmDelete(item.id)} />
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* 전송/삭제 토스트 */}
      {toast ? (
        <View
          className="absolute left-xl right-xl px-lg py-md"
          style={{
            bottom: 28,
            backgroundColor: c['bg-primary'],
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: c['border-secondary'],
          }}>
          <AppText variant="body" className="text-center text-text-primary">
            {toast}
          </AppText>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
