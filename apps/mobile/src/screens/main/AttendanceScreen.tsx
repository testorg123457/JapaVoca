/**
 * AttendanceScreen — 출석체크.
 *
 * ⚠️ 서버에 월별/이력 조회 API가 없다(attendance/today, daily/today 만 존재).
 * 백엔드를 임의로 추가하지 않고(프롬프트 지시), 가용 데이터로 구현한다:
 *  - 정확값: 연속 출석(streak_count), 오늘 출석 여부 (attendance/today).
 *  - 달력의 출석 표시: streak 기반 "추정"(오늘/어제부터 streak일 역산). 일별 퀴즈수는 이력 API가 없어 생략.
 *
 * 달력은 외부 라이브러리 없이 현재 월을 경량 자체 렌더. 미출석이면 출석 체크 버튼.
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppHeader, AppText, Button, Icon, Tag } from '../../components';
import { hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useAttendance, useAttendanceStatus } from '../../api/hooks';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 현재 월 + streak 기반 추정 출석일 집합으로 달력 셀 데이터 구성. */
function buildMonth(streak: number, checkedIn: boolean) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 추정: 마지막 출석일(오늘 출석했으면 오늘, 아니면 어제)부터 streak일 역산.
  const lastDay = checkedIn ? today : today - 1;
  const attended = new Set<number>();
  for (let i = 0; i < streak; i++) {
    const d = lastDay - i;
    if (d >= 1) {
      attended.add(d);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // 7의 배수로 마지막 줄 채우기.
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const monthCount = Array.from(attended).filter((d) => d <= daysInMonth).length;
  return { year, month, today, cells, attended, monthCount };
}

export default function AttendanceScreen(): React.JSX.Element {
  const c = useThemeColors();
  const attendance = useAttendanceStatus();
  const checkIn = useAttendance();

  const streak = attendance.data?.streak_count ?? 0;
  const checkedIn = attendance.data?.checked_in ?? false;
  const { year, month, today, cells, attended, monthCount } = buildMonth(streak, checkedIn);

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="출석체크" showBack />
      <View className="flex-1 gap-2xl px-xl py-xl">
        {/* 요약 — 카드 없이 텍스트 계층 */}
        <View className="gap-xs">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Icon name="flame" size={18} color={c.amber} />
            <AppText variant="label" className="text-text-secondary">
              연속 출석
            </AppText>
          </View>
          <View className="flex-row items-end" style={{ gap: 4 }}>
            <AppText variant="hero" className="text-text-primary">
              {streak}
            </AppText>
            <AppText variant="title" className="text-text-secondary" style={{ marginBottom: 6 }}>
              일
            </AppText>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {checkedIn ? (
              <Tag label="오늘 출석 완료" variant="success" leftIcon="check" />
            ) : (
              <Tag label="오늘 미출석" variant="neutral" />
            )}
            <AppText variant="caption" className="text-text-tertiary">
              이번 달 {monthCount}일(연속 기준)
            </AppText>
          </View>
        </View>

        {/* 달력 — 현재 월 */}
        <View className="gap-md">
          <AppText variant="heading" className="text-text-primary">
            {year}년 {month + 1}월
          </AppText>

          {/* 요일 헤더 */}
          <View className="flex-row">
            {WEEKDAYS.map((w) => (
              <View key={w} className="flex-1 items-center py-xs">
                <AppText variant="caption" className="text-text-tertiary">
                  {w}
                </AppText>
              </View>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={{ borderTopWidth: hairline, borderTopColor: c['border-tertiary'] }}>
            {Array.from({ length: cells.length / 7 }).map((_, week) => (
              <View key={week} className="flex-row">
                {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                  const isToday = day === today;
                  const isAttended = day !== null && attended.has(day);
                  return (
                    <View
                      key={i}
                      className="flex-1 items-center justify-center"
                      style={{
                        height: 44,
                        borderBottomWidth: hairline,
                        borderBottomColor: c['border-tertiary'],
                      }}>
                      {day !== null && (
                        <View
                          className="items-center justify-center rounded-full"
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: isAttended ? c.brand : 'transparent',
                            borderWidth: isToday && !isAttended ? 1.5 : 0,
                            borderColor: c.brand,
                          }}>
                          <AppText
                            variant="label"
                            style={{
                              color: isAttended ? c['on-brand'] : isToday ? c.brand : c['text-primary'],
                            }}>
                            {day}
                          </AppText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <AppText variant="caption" className="text-text-tertiary">
            * 출석 표시는 연속 출석 기준 추정입니다(서버 월별 이력 API 도입 시 정확해집니다).
          </AppText>
        </View>

        {/* 오늘 미출석이면 체크 버튼 */}
        {attendance.isLoading ? (
          <ActivityIndicator color={c.brand} />
        ) : !checkedIn ? (
          <Button
            title="오늘 출석 체크"
            leftIcon="check"
            onPress={() => checkIn.mutate()}
            loading={checkIn.isPending}
          />
        ) : null}
      </View>
    </View>
  );
}
