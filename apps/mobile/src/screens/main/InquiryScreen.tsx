import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { AppHeader, AppText } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import {
  useInquiries,
  useMarkAllInquiriesRead,
  usePostInquiry,
  useUnreadInquiryCount,
  type Inquiry,
} from '../../api/hooks';

function formatDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000); // KST = UTC+9
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }): React.JSX.Element {
  const c = useThemeColors();
  const hasAnswer = inquiry.answer !== null && inquiry.answer !== '';
  const isNew = hasAnswer && !inquiry.is_answer_read;

  return (
    <View
      className="mx-xl overflow-hidden rounded-xl bg-bg-primary"
      style={{ flexDirection: 'row' }}>
      {isNew ? <View style={{ width: 4, backgroundColor: c.brand }} /> : null}
      <View className="flex-1 gap-sm p-lg">
        <AppText variant="caption" className="text-text-tertiary">
          {formatDate(inquiry.created_at)}
        </AppText>
        <AppText variant="body" className="text-text-primary">
          {inquiry.content}
        </AppText>
        {hasAnswer ? (
          <>
            <View className="border-b border-border-tertiary" />
            <AppText variant="body" className="text-text-secondary">
              {`💬 ${inquiry.answer}`}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" className="text-right text-text-tertiary">
            ⏳ 답변 준비 중
          </AppText>
        )}
      </View>
    </View>
  );
}

export default function InquiryScreen(): React.JSX.Element {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inquiries = useInquiries();
  const postInquiry = usePostInquiry();
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
    return () => {
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
      setText('');
      showToast('문의가 접수됐어요.');
    } catch (err: any) {
      if (err?.response?.status === 429) {
        showToast('오늘 문의 한도에 도달했어요.');
      } else {
        showToast('문의 전송에 실패했어요. 다시 시도해주세요.');
      }
    }
  }

  const canSend = text.trim().length > 0 && !postInquiry.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppHeader title="문의하기" showBack />

      {toast ? (
        <View className="mx-xl mt-sm rounded-xl bg-bg-primary px-lg py-md">
          <AppText variant="body" className="text-center text-text-primary">
            {toast}
          </AppText>
        </View>
      ) : null}

      <FlatList
        data={inquiries.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
        renderItem={({ item }) => <InquiryCard inquiry={item} />}
        ListEmptyComponent={
          !inquiries.isLoading ? (
            <View className="items-center justify-center py-3xl">
              <AppText variant="body" className="text-center text-text-tertiary">
                {'아직 문의가 없어요.\n궁금한 점이 있으면 보내주세요.'}
              </AppText>
            </View>
          ) : null
        }
      />

      <View
        className="border-t border-border-tertiary bg-bg-primary px-xl py-md"
        style={{ gap: 8 }}>
        <TextInput
          className="rounded-xl bg-bg-secondary px-lg py-md text-text-primary"
          placeholder="무엇이 궁금하신가요?"
          placeholderTextColor={c['text-tertiary']}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <View className="items-end">
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className="rounded-xl bg-brand px-lg py-sm"
            style={{ opacity: canSend ? 1 : 0.4 }}>
            <AppText variant="label" style={{ color: c['on-brand'] }}>
              {postInquiry.isPending ? '전송 중…' : '보내기 →'}
            </AppText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
