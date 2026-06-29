# Quiz Set Abandon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정 화면에서 학습 모드/난이도 변경 시 "새 설정으로 시작" 버튼으로 현재 퀴즈 세트를 폐기하고 새 세트를 즉시 시작할 수 있게 한다.

**Architecture:** `QuizSet`에 `abandoned_at` 필드를 추가해 폐기 상태를 별도로 추적한다. 완료(`completed_at`)와 폐기(`abandoned_at`)가 독립적이므로 30초 쿨다운 로직은 건드리지 않는다. 프론트엔드는 학습 설정 선택 시 서버 저장을 즉시 하지 않고, "새 설정으로 시작" 버튼 클릭 시에만 프로필 저장 + 세트 폐기 API를 순서대로 호출한다.

**Tech Stack:** Django/DRF (Python), React Native (TypeScript), React Query

## Global Constraints

- 캐시 관련 로직(원장, 잔액) 건드리지 않음 — 이 기능은 캐시와 무관
- 세트 폐기는 `abandoned_at IS NOT NULL`로만 판단 — `completed_at`은 기존 그대로
- 쿨다운 체크(`completed_at__isnull=False`) 로직 변경 금지
- 앱 패키지: `com.japavoca.app`

---

### Task 1: QuizSet 모델에 `abandoned_at` 필드 추가 + 마이그레이션

**Files:**
- Modify: `apps/server/learning/models.py`
- Create: `apps/server/learning/migrations/0006_quizset_abandoned_at.py`

**Interfaces:**
- Produces: `QuizSet.abandoned_at` (DateTimeField, null=True, blank=True)

- [ ] **Step 1: `models.py`에 `abandoned_at` 필드 추가**

`apps/server/learning/models.py`의 `QuizSet` 클래스에서 `completed_at` 필드 바로 아래에 추가:

```python
completed_at = models.DateTimeField(null=True, blank=True)
abandoned_at = models.DateTimeField(null=True, blank=True)
```

- [ ] **Step 2: 마이그레이션 생성**

```bash
cd apps/server && source .venv/bin/activate
python manage.py makemigrations learning --name quizset_abandoned_at
```

Expected output: `Migrations for 'learning': learning/migrations/0006_quizset_abandoned_at.py`

- [ ] **Step 3: 마이그레이션 적용 (로컬 SQLite)**

```bash
python manage.py migrate learning
```

Expected output: `Applying learning.0006_quizset_abandoned_at... OK`

- [ ] **Step 4: 마이그레이션 파일 확인**

```bash
cat apps/server/learning/migrations/0006_quizset_abandoned_at.py
```

`AddField` operation이 `abandoned_at`을 추가하는지 확인.

---

### Task 2: 서비스 + 뷰 + URL — 폐기 로직

**Files:**
- Modify: `apps/server/learning/services.py`
- Modify: `apps/server/learning/views.py`
- Modify: `apps/server/learning/urls.py`
- Create: `apps/server/learning/tests/test_abandon_quiz_set.py`

**Interfaces:**
- Consumes: `QuizSet.abandoned_at` (Task 1에서 추가)
- Produces:
  - `abandon_quiz_set(user) -> None` — 활성 세트를 폐기
  - `POST /api/quiz/set/abandon/` — 200 OK (활성 세트 없어도 200)

- [ ] **Step 1: 테스트 파일 작성**

`apps/server/learning/tests/test_abandon_quiz_set.py`:

```python
from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from learning.models import QuizSet
from learning.services import abandon_quiz_set


class AbandonQuizSetTest(TestCase):
    def _user(self, **kw):
        return User.objects.create_user(
            google_uid=kw.pop('google_uid', 'g-a'),
            email=kw.pop('email', 'a@x.com'),
            **kw,
        )

    def test_active_set_gets_abandoned(self):
        user = self._user()
        qs = QuizSet.objects.create(user=user)
        self.assertIsNone(qs.abandoned_at)

        abandon_quiz_set(user)

        qs.refresh_from_db()
        self.assertIsNotNone(qs.abandoned_at)
        self.assertIsNone(qs.completed_at)  # completed_at은 건드리지 않아야 함

    def test_no_active_set_is_noop(self):
        user = self._user(google_uid='g-b', email='b@x.com')
        # 세트 없어도 예외 없이 통과
        abandon_quiz_set(user)

    def test_completed_set_not_affected(self):
        user = self._user(google_uid='g-c', email='c@x.com')
        now = timezone.now()
        qs = QuizSet.objects.create(user=user, completed_at=now)

        abandon_quiz_set(user)

        qs.refresh_from_db()
        self.assertIsNone(qs.abandoned_at)  # 완료된 세트는 폐기 안 됨

    def test_abandoned_set_not_returned_as_active(self):
        from learning.services import build_quiz_set, NoContent
        user = self._user(google_uid='g-d', email='d@x.com', study_mode='kana',
                          study_kana_hiragana=True)
        qs = QuizSet.objects.create(user=user)
        abandon_quiz_set(user)
        qs.refresh_from_db()
        self.assertIsNotNone(qs.abandoned_at)
        # 폐기된 세트는 활성으로 반환되지 않아야 함 (콘텐츠 없으면 NoContent 또는 새 세트)
        # 여기서는 폐기 세트가 재반환되지 않는 것만 확인
        active = QuizSet.objects.filter(user=user, completed_at__isnull=True,
                                        abandoned_at__isnull=True).first()
        self.assertIsNone(active)
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd apps/server && python manage.py test learning.tests.test_abandon_quiz_set -v 2
```

Expected: `AttributeError` 또는 `ImportError` (`abandon_quiz_set` 미정의)

- [ ] **Step 3: `services.py`에 `abandon_quiz_set` 함수 추가**

`apps/server/learning/services.py`의 `build_quiz_set` 함수 아래에 추가:

```python
def abandon_quiz_set(user):
    """활성 세트(미완료·미폐기)를 폐기. 없으면 no-op."""
    QuizSet.objects.filter(
        user=user,
        completed_at__isnull=True,
        abandoned_at__isnull=True,
    ).update(abandoned_at=timezone.now())
```

- [ ] **Step 4: `build_quiz_set`의 활성 세트 조회 조건에 `abandoned_at__isnull=True` 추가**

`apps/server/learning/services.py`의 `build_quiz_set` 함수 내 활성 세트 조회 부분:

```python
# 변경 전
active = (
    QuizSet.objects.filter(user=user, completed_at__isnull=True)
    .prefetch_related('items')
    .order_by('-started_at')
    .first()
)

# 변경 후
active = (
    QuizSet.objects.filter(user=user, completed_at__isnull=True, abandoned_at__isnull=True)
    .prefetch_related('items')
    .order_by('-started_at')
    .first()
)
```

- [ ] **Step 5: 테스트 실행 — PASS 확인**

```bash
cd apps/server && python manage.py test learning.tests.test_abandon_quiz_set -v 2
```

Expected: `OK` (4 tests passed)

- [ ] **Step 6: `views.py`에 `AbandonQuizSetView` 추가**

`apps/server/learning/views.py` 상단 import에 `abandon_quiz_set` 추가:

```python
from .services import (
    InvalidQuestionToken,
    NoContent,
    abandon_quiz_set,
    build_question,
    build_quiz_set,
    get_bookmark_ids,
    get_bookmarks_with_detail,
    grade_answer,
    sync_answers,
    toggle_bookmark,
)
```

파일 끝(BookmarkView 아래)에 클래스 추가:

```python
class AbandonQuizSetView(APIView):
    """POST /api/quiz/set/abandon/ — 활성 세트 폐기. 없어도 200."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        abandon_quiz_set(request.user)
        return Response({'status': 'ok'})
```

- [ ] **Step 7: `urls.py`에 URL 추가**

`apps/server/learning/urls.py`:

```python
from .views import AnswerView, AbandonQuizSetView, BookmarkView, NextQuestionView, QuizSetView, SyncAnswersView

urlpatterns = [
    path('next/', NextQuestionView.as_view(), name='quiz-next'),
    path('answer/', AnswerView.as_view(), name='quiz-answer'),
    path('set/', QuizSetView.as_view(), name='quiz-set'),
    path('set/abandon/', AbandonQuizSetView.as_view(), name='quiz-set-abandon'),
    path('sync/', SyncAnswersView.as_view(), name='quiz-sync'),
    path('bookmarks/', BookmarkView.as_view(), name='quiz-bookmarks'),
]
```

- [ ] **Step 8: 전체 learning 테스트 통과 확인**

```bash
cd apps/server && python manage.py test learning -v 2
```

Expected: 모든 테스트 OK

---

### Task 3: 프론트엔드 — `useAbandonQuizSet` 훅 추가

**Files:**
- Modify: `apps/mobile/src/api/hooks.ts`

**Interfaces:**
- Produces: `useAbandonQuizSet()` — `useMutation` 훅, 호출 시 `POST /api/quiz/set/abandon/` 실행

- [ ] **Step 1: `hooks.ts` 끝에 훅 추가**

`apps/mobile/src/api/hooks.ts` 파일 끝에 추가:

```typescript
/** 현재 활성 퀴즈 세트를 폐기. 없어도 성공. */
export function useAbandonQuizSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/quiz/set/abandon/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', 'set'] });
    },
  });
}
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (또는 기존 에러만)

---

### Task 4: 프론트엔드 — SettingsScreen UI 변경

**Files:**
- Modify: `apps/mobile/src/screens/main/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `useAbandonQuizSet()` (Task 3에서 추가)
- Produces: "새 설정으로 시작" 버튼 — `studySel`이 서버 저장값과 다를 때 노출

- [ ] **Step 1: `SettingsScreen.tsx` import에 `useAbandonQuizSet` 추가**

파일 상단 import 수정:

```typescript
import { useMe, useUpdateProfile, useAbandonQuizSet, useUnreadInquiryCount, type ProfileUpdate } from '../../api/hooks';
```

- [ ] **Step 2: 훅 초기화 추가**

`updateProfile` 훅 선언 아래에 추가:

```typescript
const abandonQuizSet = useAbandonQuizSet();
```

- [ ] **Step 3: `changeStudy` 함수에서 자동 저장 제거**

기존 `changeStudy` 함수를 아래로 교체:

```typescript
function changeStudy(next: StudySelection) {
  setStudySel(next);
}
```

- [ ] **Step 4: 설정 변경 여부 판단 헬퍼 추가**

`changeStudy` 함수 아래에 추가:

```typescript
function isPendingStudyChange(): boolean {
  if (!studySel || !m) return false;
  return (
    studySel.mode !== m.study_mode ||
    studySel.level !== m.study_level ||
    studySel.hiragana !== m.study_kana_hiragana ||
    studySel.katakana !== m.study_kana_katakana
  );
}

function applyStudyChange() {
  if (!studySel || !isStudyValid(studySel)) return;
  updateProfile.mutate(
    {
      study_mode: studySel.mode,
      study_level: studySel.level,
      study_kana_hiragana: studySel.hiragana,
      study_kana_katakana: studySel.katakana,
    },
    {
      onSuccess: () => {
        abandonQuizSet.mutate();
      },
      onError: () => {
        Alert.alert('오류', '설정 변경에 실패했어요.');
        // 서버 저장값으로 롤백
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
```

- [ ] **Step 5: StudySelector 아래에 "새 설정으로 시작" 버튼 추가**

`apps/mobile/src/screens/main/SettingsScreen.tsx`의 학습 트랙 섹션:

```tsx
{/* 학습 트랙 */}
<View className="px-xl">
  <AppText variant="label" className="text-text-tertiary" style={{ marginBottom: 12 }}>
    학습
  </AppText>
  {studySel ? <StudySelector value={studySel} onChange={changeStudy} /> : null}
  {isPendingStudyChange() && isStudyValid(studySel!) ? (
    <Pressable
      onPress={applyStudyChange}
      disabled={updateProfile.isPending || abandonQuizSet.isPending}
      className="mt-md items-center rounded-2xl py-md active:opacity-60"
      style={{ backgroundColor: c['brand-primary'] }}>
      <AppText variant="subheading" className="text-white">
        {updateProfile.isPending || abandonQuizSet.isPending ? '변경 중...' : '새 설정으로 시작'}
      </AppText>
    </Pressable>
  ) : null}
</View>
```

- [ ] **Step 6: TypeScript 타입 체크**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (또는 기존 에러만)

- [ ] **Step 7: Metro 번들러 실행 및 수동 확인**

```bash
cd apps/mobile && npm start
```

확인 항목:
1. 설정 화면 진입 — 학습 셀렉터에 현재 값이 표시됨
2. 다른 모드/난이도 선택 — "새 설정으로 시작" 버튼이 아래에 나타남
3. 원래 값으로 되돌리면 — 버튼이 사라짐
4. 버튼 클릭 — 로딩 표시 후 버튼 사라짐 (설정 저장 + 세트 폐기 완료)
5. 퀴즈 화면으로 이동 — 새 세트가 바뀐 설정으로 생성됨

---

### Task 5: Cloud Run 재배포

**Files:** 없음 (Docker 빌드 + 배포)

- [ ] **Step 1: Docker 이미지 빌드**

```bash
cd apps/server
docker build -t asia-northeast3-docker.pkg.dev/japavoca/japavoca/server:latest .
```

Expected: `Successfully built ...`

- [ ] **Step 2: Artifact Registry에 푸시**

```bash
docker push asia-northeast3-docker.pkg.dev/japavoca/japavoca/server:latest
```

- [ ] **Step 3: Cloud Run 배포**

```bash
gcloud run deploy japavoca-server \
  --image asia-northeast3-docker.pkg.dev/japavoca/japavoca/server:latest \
  --region asia-northeast3
```

Expected: `Service [japavoca-server] revision [...] has been deployed`

- [ ] **Step 4: 마이그레이션 확인**

배포 후 Cloud Run이 시작할 때 `Dockerfile`의 마이그레이션 명령이 실행되었는지 로그 확인:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=japavoca-server" \
  --limit=50 --format="value(textPayload)" | grep -i migrat
```

Expected: `Applying learning.0006_quizset_abandoned_at... OK`

- [ ] **Step 5: 엔드포인트 동작 확인**

```bash
# 토큰은 실제 로그인 후 얻은 값으로 교체
curl -X POST https://japavoca-server-637214432325.asia-northeast3.run.app/api/quiz/set/abandon/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json"
```

Expected: `{"status": "ok"}`
