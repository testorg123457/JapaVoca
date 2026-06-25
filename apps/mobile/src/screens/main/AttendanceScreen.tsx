/**
 * AttendanceScreen — 출석체크.
 *
 * 서버 월별 API(useAttendanceMonth)로 정확한 출석/일별 퀴즈수를 표시(추정 아님).
 * 월 이동 가능. 외부 캘린더 라이브러리 없이 경량 자체 렌더. 오늘 미출석이면 체크 버튼.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppHeader, AppText, Button, Icon, ProgressBar, Tag } from '../../components';
import { hairline } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useAttendance, useAttendanceMonth, useAttendanceStatus } from '../../api/hooks';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function AttendanceScreen(): React.JSX.Element {
  const c = useThemeColors();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based

  const monthData = useAttendanceMonth(year, month);
  const status = useAttendanceStatus();
  const checkIn = useAttendance();

  const streak = monthData.data?.streak_count ?? status.data?.streak_count ?? 0;
  const checkedIn = status.data?.checked_in ?? false;

  // 일자별 출석/퀴즈수 맵.
  const dayMap = new Map(
    (monthData.data?.days ?? []).map((d) => [d.date, d]),
  );
  const attendedCount = (monthData.data?.days ?? []).filter((d) => d.attended).length;

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const todayDate = now.getDate();

  // 주간 진척도 — 7일 연속 출석마다 +30C. streak를 7일 주기로 환산.
  const WEEKLY_BONUS = 30;
  const daysThisWeek = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
  const weeklyProgress = daysThisWeek / 7;
  const daysToBonus = daysThisWeek === 0 ? 7 : 7 - daysThisWeek;

  // 달력 셀 구성.
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="출석체크" showBack />
      <View className="flex-1 gap-2xl px-xl py-xl">
        {/* 요약 */}
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
              이번 달 {attendedCount}일 출석
            </AppText>
          </View>
        </View>

        {/* 달력 */}
        <View className="gap-md">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} className="active:opacity-60">
              <Icon name="arrow-left" size={22} color={c['text-secondary']} />
            </Pressable>
            <AppText variant="heading" className="text-text-primary">
              {year}년 {month}월
            </AppText>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={10} className="active:opacity-60">
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="arrow-left" size={22} color={c['text-secondary']} />
              </View>
            </Pressable>
          </View>

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

          {monthData.isLoading ? (
            <ActivityIndicator className="my-2xl" color={c.brand} />
          ) : (
            <View style={{ borderTopWidth: hairline, borderTopColor: c['border-tertiary'] }}>
              {Array.from({ length: cells.length / 7 }).map((_, week) => (
                <View key={week} className="flex-row">
                  {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                    const dateStr = day !== null ? `${year}-${pad(month)}-${pad(day)}` : '';
                    const info = day !== null ? dayMap.get(dateStr) : undefined;
                    const attended = !!info?.attended;
                    const quiz = info?.quiz_count ?? 0;
                    const isToday = isCurrentMonth && day === todayDate;
                    return (
                      <View
                        key={i}
                        className="flex-1 items-center justify-center"
                        style={{ height: 52, borderBottomWidth: hairline, borderBottomColor: c['border-tertiary'] }}>
                        {day !== null && (
                          <View className="items-center" style={{ gap: 2 }}>
                            <View
                              className="items-center justify-center rounded-full"
                              style={{
                                width: 30,
                                height: 30,
                                backgroundColor: attended ? c.brand : 'transparent',
                                borderWidth: isToday && !attended ? 1.5 : 0,
                                borderColor: c.brand,
                              }}>
                              <AppText
                                variant="label"
                                style={{ color: attended ? c['on-brand'] : isToday ? c.brand : c['text-primary'] }}>
                                {day}
                              </AppText>
                            </View>
                            {quiz > 0 ? (
                              <AppText variant="micro" className="text-text-tertiary" style={{ fontSize: 9 }}>
                                {quiz}문제
                              </AppText>
                            ) : (
                              <View style={{ height: 12 }} />
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 주간 출석 진척도 — 7일 연속 시 +30C */}
        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Icon name="gift" size={16} color={c.amber} />
              <AppText variant="label" className="text-text-secondary">
                주간 연속 출석 보너스
              </AppText>
            </View>
            <AppText variant="label" className="text-text-primary">
              {daysThisWeek} / 7일
            </AppText>
          </View>
          <ProgressBar progress={weeklyProgress} />
          <AppText variant="caption" className="text-text-tertiary">
            {daysToBonus === 7 && daysThisWeek === 7
              ? `7일 연속 달성! +${WEEKLY_BONUS}C 적립`
              : `${daysToBonus}일 더 연속 출석하면 +${WEEKLY_BONUS}C`}
          </AppText>
        </View>

        {/* 오늘 미출석이면 체크 버튼 */}
        {status.isLoading ? null : !checkedIn ? (
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
