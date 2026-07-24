/**
 * 문의하기 — "보내기 중심" 화면.
 *
 * 주인공은 상단 입력창. 문의를 보내는 것으로 흐름이 끝난다.
 * 답변은 전제하지 않는다 — 운영자가 답을 남기면 보낸 문의 카드 안에 붙고,
 * 답이 없으면 내가 보낸 글로만 남는다('대기 중' 같은 표현을 쓰지 않는다).
 *
 * ⚠️ 디자인 시스템을 따른다 — 라운드/여백/타이포는 토큰과 공용 컴포넌트만 쓰고
 *    하드코딩하지 않는다(`docs/디자인-시스템-원칙.md`). 면은 Card, 액션은 Button.
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

import { AppHeader, AppText, Button, Card, Icon, useToast } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import {
  useDeleteInquiry,
  useInquiries,
  useMarkAllInquiriesRead,
  usePostInquiry,
  useUnreadInquiryCount,
  type Inquiry,
} from '../../api/hooks';

const MAX_LEN = 2000;
/** 글자 수가 이 비율을 넘으면 카운터를 강조해 한도가 가깝다는 걸 알린다. */
const COUNTER_WARN_RATIO = 0.9;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

/** 보낸 문의 1건. 답변이 있을 때만 답변 블록을 붙인다. */
function SentCard({
  inquiry,
  onDelete,
}: {
  inquiry: Inquiry;
  onDelete: () => void;
}): React.JSX.Element {
  const c = useThemeColors();
  const hasAnswer = !!inquiry.answer;

  return (
    <Card className="mb-lg">
      <View className="flex-row items-center justify-between">
        <AppText variant="caption" className="text-text-tertiary">
          {formatDate(inquiry.created_at)}
        </AppText>
        <Pressable onPress={onDelete} hitSlop={10} className="active:opacity-60">
          <AppText variant="caption" className="text-text-tertiary">삭제</AppText>
        </Pressable>
      </View>

      <AppText variant="body" className="mt-sm text-text-primary">
        {inquiry.content}
      </AppText>

      {hasAnswer && (
        // 답변은 문의와 확실히 구분되게 브랜드 톤 면 위에 올린다.
        <View
          className="mt-lg gap-sm p-lg"
          style={{ backgroundColor: c['brand-subtle'], borderRadius: radius.md }}>
          <View className="flex-row items-center gap-xs">
            <Icon name="mail" size={14} color={c.brand} />
            <AppText variant="label" style={{ color: c.brand, fontWeight: '700' }}>
              답변
            </AppText>
          </View>
          <AppText variant="body" className="text-text-primary">
            {inquiry.answer}
          </AppText>
        </View>
      )}
    </Card>
  );
}

export default function InquiryScreen(): React.JSX.Element {
  const c = useThemeColors();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
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
    return () => { mountedRef.current = false; };
  }, []);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || postInquiry.isPending) { return; }
    try {
      await postInquiry.mutateAsync(trimmed);
      if (!mountedRef.current) { return; }
      setText('');
      showToast('문의를 보냈어요. 감사합니다!');
    } catch (err: any) {
      if (!mountedRef.current) { return; }
      if (err?.response?.status === 429) {
        showToast('오늘 문의 한도에 도달했어요.', 'error');
      } else {
        showToast('문의 전송에 실패했어요. 다시 시도해주세요.', 'error');
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
            onError: () => showToast('삭제에 실패했어요. 다시 시도해주세요.', 'error'),
          }),
      },
    ]);
  }

  const canSend = text.trim().length > 0 && !postInquiry.isPending;
  const list = inquiries.data ?? [];
  const nearLimit = text.length > MAX_LEN * COUNTER_WARN_RATIO;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="문의하기" showBack />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-2xl px-xl py-xl"
        contentContainerStyle={{ paddingBottom: spacing['5xl'] }}
        showsVerticalScrollIndicator={false}>
        {/* 리드 — 보내기를 유도하되 답변을 약속하지 않는다. */}
        <View className="gap-sm">
          <AppText variant="title" className="text-text-primary">
            {'궁금한 점이나 의견을\n편하게 보내주세요'}
          </AppText>
          <AppText variant="caption" className="text-text-secondary">
            버그·제안·불편한 점 무엇이든 좋아요. 확인 후 필요한 경우 답변을 남겨 드려요.
          </AppText>
        </View>

        {/* 입력 — 이 화면의 주 액션. 포커스되면 테두리를 브랜드색으로 올려 초점을 준다. */}
        <View className="gap-lg">
          <View
            className="p-xl"
            style={{
              backgroundColor: c['bg-primary'],
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: focused ? c.brand : c['border-secondary'],
            }}>
            <TextInput
              style={{
                minHeight: 108,
                fontSize: 15,
                lineHeight: 22,
                textAlignVertical: 'top',
                padding: 0,
                color: c['text-primary'],
              }}
              placeholder="무엇이든 편하게 적어주세요."
              placeholderTextColor={c['text-tertiary']}
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              multiline
              maxLength={MAX_LEN}
            />
            <View className="mt-md flex-row justify-end">
              <AppText
                variant="caption"
                style={{ color: nearLimit ? c.danger : c['text-tertiary'] }}>
                {text.length} / {MAX_LEN}
              </AppText>
            </View>
          </View>

          <Button
            title="문의 보내기"
            onPress={handleSend}
            disabled={!canSend}
            loading={postInquiry.isPending}
          />
        </View>

        {/* 보낸 문의 — 있을 때만 */}
        {list.length > 0 && (
          <View>
            <AppText variant="label" className="mb-md text-text-secondary">
              보낸 문의
            </AppText>
            {list.map((item) => (
              <SentCard key={item.id} inquiry={item} onDelete={() => confirmDelete(item.id)} />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
