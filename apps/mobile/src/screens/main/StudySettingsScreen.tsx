/**
 * StudySettingsScreen — 학습 설정(트랙·급수·가나).
 *
 * 설정 첫 화면에 인라인으로 박혀 있던 편집 블록을 제 화면으로 뺐다. 다른 항목은 전부
 * 한 줄짜리 행인데 여기만 큰 편집 UI라 목록의 리듬이 깨졌었다.
 *
 * ⚠️ 저장은 **세 가지가 한 세트**다 — 프로필 갱신 → 진행 중인 퀴즈 세트 폐기(abandon)
 *    → 로컬 캐시 세트 삭제. 학습 트랙이 바뀌었는데 옛 세트가 남아 있으면 바뀐 설정과
 *    다른 문제가 계속 나온다. 셋 중 하나라도 빠뜨리면 안 된다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppHeader, AppText, Icon, PressableScale, StudySelector, useToast } from '../../components';
import { radius } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeProvider';
import { useAbandonQuizSet, useMe, useUpdateProfile } from '../../api/hooks';
import { clearCachedSet } from '../../store/quizSet';
import { isStudyValid, type StudySelection } from '../onboarding/studyContent';

export default function StudySettingsScreen(): React.JSX.Element {
  const { showToast } = useToast();
  const c = useThemeColors();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const abandonQuizSet = useAbandonQuizSet();

  const [studySel, setStudySel] = useState<StudySelection | null>(null);
  const studyInitialized = useRef(false);
  const [justSaved, setJustSaved] = useState(false);
  const [studySaving, setStudySaving] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const m = me.data;

  // me 로드 후 딱 한 번만 초기화(useRef 플래그로 이후 변경에 의한 재초기화 방지).
  useEffect(() => {
    if (m && !studyInitialized.current) {
      studyInitialized.current = true;
      setStudySel({
        mode: (m.study_mode as StudySelection['mode']) ?? null,
        level: (m.study_level as StudySelection['level']) ?? null,
        hiragana: m.study_kana_hiragana,
        katakana: m.study_kana_katakana,
      });
    }
  }, [m]);

  useEffect(() => () => {
    if (savedTimer.current) { clearTimeout(savedTimer.current); }
  }, []);

  function changeStudy(next: StudySelection) {
    setStudySel(next);
    setJustSaved(false);
  }

  function isPendingStudyChange(): boolean {
    if (!studySel || !m) { return false; }
    return (
      studySel.mode !== m.study_mode ||
      studySel.level !== m.study_level ||
      studySel.hiragana !== m.study_kana_hiragana ||
      studySel.katakana !== m.study_kana_katakana
    );
  }

  function applyStudyChange() {
    if (!studySel || !isStudyValid(studySel)) { return; }
    setStudySaving(true);
    updateProfile.mutate(
      {
        study_mode: studySel.mode,
        study_level: studySel.level,
        study_kana_hiragana: studySel.hiragana,
        study_kana_katakana: studySel.katakana,
      },
      {
        onSuccess: () => {
          abandonQuizSet.mutate(undefined, {
            onSuccess: () => {
              clearCachedSet(); // 다음 진입 시 새 세트를 받도록
              setStudySaving(false);
              setJustSaved(true);
              if (savedTimer.current) { clearTimeout(savedTimer.current); }
              savedTimer.current = setTimeout(() => setJustSaved(false), 1500);
            },
            onError: () => setStudySaving(false),
          });
        },
        onError: () => {
          setStudySaving(false);
          showToast('설정을 저장하지 못했어요', 'error');
          if (m) {
            setStudySel({
              mode: (m.study_mode as StudySelection['mode']) ?? null,
              level: (m.study_level as StudySelection['level']) ?? null,
              hiragana: m.study_kana_hiragana,
              katakana: m.study_kana_katakana,
            });
          }
        },
      },
    );
  }

  const studyLoading = studySaving;
  const studyPending = isPendingStudyChange() && !!studySel && isStudyValid(studySel);
  const studySolid = studyLoading || justSaved || studyPending;

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="학습 설정" showBack />
      <ScrollView contentContainerClassName="gap-2xl py-xl" showsVerticalScrollIndicator={false}>
        <View className="px-xl">
          <AppText variant="label" className="text-text-tertiary" style={{ marginBottom: 12 }}>
            무엇을 공부할까요
          </AppText>
          {studySel ? <StudySelector value={studySel} onChange={changeStudy} /> : null}
          <PressableScale
            onPress={applyStudyChange}
            disabled={!studyPending || studyLoading}
            pressedScale={0.99}
            style={{
              marginTop: 8,
              borderRadius: radius.md,
              paddingVertical: 17,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              backgroundColor: studySolid ? c.brand : c['brand-subtle'],
            }}>
            <AppText
              variant="subheading"
              style={{ color: studySolid ? c['on-brand'] : c.brand, fontWeight: '700' }}>
              {studyLoading ? '저장 중…' : justSaved ? '설정되었습니다' : '이 설정으로 학습하기'}
            </AppText>
            {justSaved ? (
              <Animated.View entering={ZoomIn.springify().damping(13).stiffness(200)}>
                <Icon name="check" size={18} color={c['on-brand']} strokeWidth={3} />
              </Animated.View>
            ) : null}
          </PressableScale>
        </View>

        <View className="px-xl">
          <AppText variant="caption" className="text-text-tertiary">
            설정을 바꾸면 풀던 문제 묶음은 버리고 새로 받아요.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
