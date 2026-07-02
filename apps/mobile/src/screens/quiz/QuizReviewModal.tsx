import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Icon, PressableScale } from '../../components';
import { toggleBookmark, type QuizItemType } from '../../api/quiz';
import { useSpeak } from '../../lib/useSpeak';
import { gray, mint, red, yellow, primitives, radius, shadowStyle } from '../../theme/tokens';
import type { ReviewData, ReviewEntry } from '../../store/quizSet';

// 라이트 팔레트 — tokens.ts 단일 소스
const C = {
  bg: gray[50],
  surface: gray[0],
  line: gray[200],
  ink: gray[900],
  sub: gray[600],
  weak: gray[500],
  brand: mint[500],
  onBrand: gray[0],
  success: primitives.green[500],
  successBg: primitives.green[50],
  danger: red[500],
  dangerBg: red[50],
  amber: yellow[400],
  amberText: yellow[600],
  chip: gray[100],
};

function formatSecs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0
    ? `${m}:${sec.toString().padStart(2, '0')}`
    : `${sec}초`;
}

function CooldownLabel({ until }: { until?: string }): React.JSX.Element {
  const [text, setText] = useState(() => {
    if (!until) { return '새 세트 준비 중...'; }
    const diff = new Date(until).getTime() - Date.now();
    return diff > 0 ? `새 세트까지 ${formatSecs(diff)}` : '새 세트 준비 중...';
  });

  useEffect(() => {
    if (!until) { return; }
    const id = setInterval(() => {
      const diff = new Date(until).getTime() - Date.now();
      setText(diff > 0 ? `새 세트까지 ${formatSecs(diff)}` : '새 세트 준비 중...');
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  return (
    <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
      {text}
    </AppText>
  );
}

function SpeakButton({ text }: { text: string }): React.JSX.Element {
  const { speaking, toggle } = useSpeak(text);
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1,
        borderColor: speaking ? mint[500] : gray[200],
        backgroundColor: speaking ? primitives.green[50] : gray[0],
      }}>
      <Icon name="volume" size={13} color={speaking ? mint[500] : gray[500]} strokeWidth={2} />
      <AppText variant="caption" style={{ color: speaking ? mint[500] : gray[500] }}>
        {speaking ? '■' : '듣기'}
      </AppText>
    </TouchableOpacity>
  );
}

function BookmarkButton({
  itemType, itemId, onNetworkError,
}: { itemType: QuizItemType; itemId: number; onNetworkError: () => void }): React.JSX.Element {
  const [marked, setMarked] = useState(false);
  const onPress = async () => {
    const next = !marked;
    setMarked(next);
    try {
      await toggleBookmark(itemType, itemId, next);
    } catch (err: any) {
      setMarked(!next);
      if (!err?.response) { onNetworkError(); }
    }
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1,
        borderColor: marked ? yellow[400] : gray[200],
        backgroundColor: marked ? yellow[50] : gray[0],
      }}>
      <Icon name={marked ? 'bookmark-filled' : 'bookmark'} size={13} color={marked ? yellow[600] : gray[500]} strokeWidth={2} />
      <AppText variant="caption" style={{ color: marked ? yellow[600] : gray[500] }}>
        북마크
      </AppText>
    </TouchableOpacity>
  );
}

function EntryRow({
  entry, onNetworkError,
}: { entry: ReviewEntry; onNetworkError: () => void }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const { question, selectedIndex, isCorrect } = entry;
  const { detail, choices, answer_index, item_type, item_id } = question;

  const speakText = detail.on_reading || detail.reading || detail.surface;

  return (
    <View>
      {/* 행 헤더 */}
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12, gap: 10,
        }}>
        {/* 정오 아이콘 */}
        <View style={{
          width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
          backgroundColor: isCorrect ? C.successBg : C.dangerBg,
        }}>
          <Icon
            name={isCorrect ? 'check' : 'close'}
            size={12}
            color={isCorrect ? C.success : C.danger}
            strokeWidth={2.5}
          />
        </View>
        {/* 텍스트 */}
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="subheading" style={{ color: C.ink }}>{detail.surface}</AppText>
          <AppText variant="caption" style={{ color: C.sub }}>{detail.meaning}</AppText>
        </View>
        {/* 펼침 화살표 */}
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon name="chevron-down" size={16} color={C.weak} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      {/* 펼친 상세 */}
      {open && (
        <View style={{
          marginHorizontal: 16, marginBottom: 8,
          backgroundColor: C.surface,
          borderRadius: radius.lg,
          borderWidth: 1, borderColor: C.line,
          ...shadowStyle('sm'),
          overflow: 'hidden',
        }}>
          {/* 선택지 */}
          <View style={{ padding: 12, gap: 6 }}>
            {choices.map(choice => {
              const isAnswer = choice.index === answer_index;
              const isMine = choice.index === selectedIndex;
              const isWrongPick = isMine && !isCorrect;

              const bg: string = isAnswer ? C.successBg : isWrongPick ? C.dangerBg : 'transparent';
              const textColor: string = isAnswer ? C.success : isWrongPick ? C.danger : C.sub;
              const dotColor: string = isAnswer ? C.success : isWrongPick ? C.danger : C.line;

              return (
                <View
                  key={choice.index}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    paddingHorizontal: 10, paddingVertical: 6,
                    borderRadius: radius.sm,
                    backgroundColor: bg,
                  }}>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: dotColor,
                  }} />
                  <AppText
                    variant="body"
                    style={{ color: textColor, fontWeight: isAnswer ? '600' : '400' }}>
                    {choice.text}
                  </AppText>
                </View>
              );
            })}
          </View>

          {/* 구분선 */}
          <View style={{ height: 1, backgroundColor: C.line, marginHorizontal: 12 }} />

          {/* 읽기 + 버튼 */}
          <View style={{ padding: 12, gap: 8 }}>
            {!!(detail.reading || detail.on_reading) && (
              <AppText variant="caption" style={{ color: C.weak }}>
                {detail.on_reading || detail.reading}
              </AppText>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SpeakButton text={speakText} />
              <BookmarkButton itemType={item_type} itemId={item_id} onNetworkError={onNetworkError} />
            </View>
          </View>
        </View>
      )}

      {/* 헤어라인 */}
      <View style={{ height: 1, backgroundColor: C.line, marginHorizontal: 0 }} />
    </View>
  );
}

export function QuizReviewModal({
  data,
  cooldownUntil,
  onClose,
}: {
  data: ReviewData;
  cooldownUntil?: string;
  onClose: () => void;
}): React.JSX.Element {
  const correct = data.entries.filter(e => e.isCorrect).length;
  const total = data.entries.length;

  const [networkNotice, setNetworkNotice] = useState(false);
  useEffect(() => {
    if (!networkNotice) { return; }
    const id = setTimeout(() => setNetworkNotice(false), 2000);
    return () => clearTimeout(id);
  }, [networkNotice]);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

          {/* 헤더 — 민트 배경 */}
          <View style={{
            backgroundColor: C.brand,
            paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
            flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <View style={{ gap: 2 }}>
              <AppText variant="subheading" style={{ color: C.onBrand }}>
                지난 세트 복습
              </AppText>
              <AppText variant="caption" style={{ color: C.onBrand }}>
                {correct} / {total} 정답
              </AppText>
              <CooldownLabel until={cooldownUntil} />
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="close" size={20} color={C.onBrand} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* 네트워크 오류 배너 */}
          {networkNotice && (
            <View style={{
              marginHorizontal: 16, marginTop: 12,
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: C.dangerBg,
              borderWidth: 1, borderColor: C.danger,
              borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
            }}>
              <Icon name="close" size={16} color={C.danger} strokeWidth={2.4} />
              <AppText variant="label" style={{ color: C.danger }}>
                네트워크 연결을 확인해주세요
              </AppText>
            </View>
          )}

          {/* 리스트 */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}>
            {/* 점수 프로그레스 바 */}
            <View style={{
              marginHorizontal: 16, marginTop: 12, marginBottom: 8,
              backgroundColor: C.surface,
              borderRadius: radius.lg,
              borderWidth: 1, borderColor: C.line,
              padding: 14,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <View>
                <AppText variant="title" style={{ color: C.ink }}>
                  <AppText variant="title" style={{ color: C.brand }}>{correct}</AppText>
                  {' / '}{total}
                </AppText>
                <AppText variant="caption" style={{ color: C.weak }}>정답</AppText>
              </View>
              <View style={{ flex: 1, height: 6, backgroundColor: gray[100], borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.round((correct / total) * 100)}%`,
                  height: '100%',
                  backgroundColor: C.brand,
                  borderRadius: 3,
                }} />
              </View>
            </View>

            {/* 섹션 라벨 */}
            <AppText
              variant="micro"
              style={{
                color: C.weak, letterSpacing: 0.8, textTransform: 'uppercase',
                paddingHorizontal: 16, paddingVertical: 6,
              }}>
              문제 목록 {total}개
            </AppText>

            {/* 구분선 */}
            <View style={{ height: 1, backgroundColor: C.line }} />

            {/* 문제 행들 */}
            {data.entries.map((entry, i) => (
              <EntryRow
                key={entry.question.question_token ?? i}
                entry={entry}
                onNetworkError={() => setNetworkNotice(true)}
              />
            ))}
          </ScrollView>

        </SafeAreaView>
      </View>
    </Modal>
  );
}
