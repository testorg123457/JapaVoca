/**
 * AttendanceCalendar — 홈 하단 출석 위젯.
 *
 * 출석 캐시는 없다. 누적 7회 출석마다 보라 상자를 받는다(서버 check_in).
 * 구성: 헤더(출석 + 연속) → 보라 상자 진행바(N/7) → 월 달력(출석=민트) → 출석 체크 버튼.
 * 민트는 기능(오늘·출석·주액션)에만, 보라는 상자 보상 신호로만 쓴다.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Icon, PressableScale } from '../../../components';
import { hairline, primitives, radius, shadowStyle } from '../../../theme/tokens';
import { useThemeColors } from '../../../theme/ThemeProvider';
import { useToast } from '../../../components';
import { useAttendance, useAttendanceMonth, useAttendanceStatus } from '../../../api/hooks';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const CYCLE = 7;
const PURPLE = primitives.purple[500];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function AttendanceCalendar(): React.JSX.Element {
  const c = useThemeColors();
  const { showToast } = useToast();
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const status = useAttendanceStatus();
  const monthData = useAttendanceMonth(view.year, view.month);
  const checkIn = useAttendance();

  const checkedIn = status.data?.checked_in ?? false;
  const streak = status.data?.streak_count ?? 0;
  const total = status.data?.total_count ?? 0;
  const progress = total % CYCLE; // 이번 주기 진행(0~6)

  const dayMap = new Map((monthData.data?.days ?? []).map((d) => [d.date, d]));

  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth() + 1;
  const todayDate = now.getDate();

  const startWeekday = new Date(view.year, view.month - 1, 1).getDay();
  const daysInMonth = new Date(view.year, view.month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month - 1 + delta, 1);
      const next = { year: d.getFullYear(), month: d.getMonth() + 1 };
      // 미래 달로는 못 감.
      if (next.year > now.getFullYear() || (next.year === now.getFullYear() && next.month > now.getMonth() + 1)) {
        return v;
      }
      return next;
    });
  }

  function onCheckIn() {
    if (checkedIn || checkIn.isPending) {
      return;
    }
    checkIn.mutate(undefined, {
      onSuccess: (res) => {
        if (res.box_granted) {
          showToast('출석 7번 달성! 보라 상자를 받았어요', 'info');
        }
      },
    });
  }

  return (
    <View className="px-xl">
      <View
        className="bg-bg-primary"
        style={[{ borderRadius: radius.lg, padding: 18, gap: 16 }, shadowStyle('xs')]}>
        {/* 헤더 */}
        <View className="flex-row items-center justify-between">
          <AppText variant="title" className="text-text-primary">
            출석
          </AppText>
          {streak > 0 ? (
            <AppText variant="caption" className="text-text-tertiary">
              {streak}일 연속
            </AppText>
          ) : null}
        </View>

        {/* 보라 상자 진행 — 7칸 세그먼트 */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 26, height: 26, backgroundColor: primitives.purple[50] }}>
              <Icon name="gift" size={15} color={PURPLE} />
            </View>
            <AppText variant="caption" className="text-text-secondary" style={{ flex: 1 }}>
              7번 출석하면 보라 상자
            </AppText>
            <AppText variant="label" style={{ color: PURPLE }}>
              {progress}/{CYCLE}
            </AppText>
          </View>
          <View className="flex-row" style={{ gap: 4 }}>
            {Array.from({ length: CYCLE }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i < progress ? PURPLE : c['bg-tertiary'],
                }}
              />
            ))}
          </View>
        </View>

        <View style={{ height: hairline, backgroundColor: c['border-tertiary'] }} />

        {/* 월 네비 */}
        <View className="flex-row items-center justify-between">
          <PressableScale onPress={() => shiftMonth(-1)} hitSlop={10}>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="chevron-right" size={20} color={c['text-secondary']} />
            </View>
          </PressableScale>
          <AppText variant="subheading" className="text-text-primary">
            {view.year}년 {view.month}월
          </AppText>
          <PressableScale onPress={() => shiftMonth(1)} hitSlop={10} disabled={isCurrentMonth}>
            <Icon
              name="chevron-right"
              size={20}
              color={isCurrentMonth ? c['border-secondary'] : c['text-secondary']}
            />
          </PressableScale>
        </View>

        {/* 요일 헤더 */}
        <View className="flex-row">
          {WEEKDAYS.map((w) => (
            <View key={w} className="flex-1 items-center">
              <AppText variant="micro" className="text-text-tertiary">
                {w}
              </AppText>
            </View>
          ))}
        </View>

        {/* 날짜 그리드 */}
        <View style={{ gap: 6 }}>
          {weeks.map((week, wi) => (
            <View key={wi} className="flex-row">
              {week.map((day, di) => {
                if (day === null) {
                  return <View key={di} className="flex-1" style={{ height: 34 }} />;
                }
                const dateStr = `${view.year}-${pad(view.month)}-${pad(day)}`;
                const attended = dayMap.get(dateStr)?.attended ?? false;
                const isToday = isCurrentMonth && day === todayDate;
                return (
                  <View key={di} className="flex-1 items-center justify-center" style={{ height: 34 }}>
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
                        variant="caption"
                        style={{
                          color: attended
                            ? c['on-brand']
                            : isToday
                              ? c.brand
                              : c['text-secondary'],
                          fontWeight: attended || isToday ? '700' : '400',
                        }}>
                        {day}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* 출석 체크 */}
        {checkedIn ? (
          <View
            className="flex-row items-center justify-center rounded-md"
            style={{ gap: 6, height: 48, backgroundColor: c['brand-subtle'] }}>
            <Icon name="check" size={18} color={c.brand} strokeWidth={2.6} />
            <AppText variant="subheading" style={{ color: c.brand }}>
              오늘 출석 완료
            </AppText>
          </View>
        ) : (
          <Button title="출석 체크" onPress={onCheckIn} loading={checkIn.isPending} />
        )}
      </View>
    </View>
  );
}

export default AttendanceCalendar;
