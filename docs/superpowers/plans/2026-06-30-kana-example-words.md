# 가나 퀴즈 사용 단어 표시 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 히라가나/가타카나 퀴즈 결과 패널에 해당 글자가 쓰이는 예시 단어 2개를 "사용 단어" 카드로 표시한다. 단어는 랜덤 풀에서 매 조회마다 2개 무작위 선택. 카드 탭 시 TTS 재생.

**Architecture:** Word FK 없는 독립 테이블 `KanaExample`(kana FK + surface + kanji + meaning_ko)을 추가한다. 글자당 단어 수 제한 없음(랜덤 풀). 데이터 입력은 외부 프로젝트에서 직접 수행. 백엔드 `_item_detail(KANA)` 에서 `order_by('?')[:2]` 로 랜덤 2개를 `example_words` 에 담아 반환하면 프론트엔드 `AnswerReveal` 이 가로 2칸 카드로 렌더하며, 탭 시 `Tts.speak(surface)` 재생.

**Tech Stack:** Django 4 (model + migration), React Native (TypeScript), react-native-tts (기존), quiz theme 색체계

## Global Constraints

- 백엔드 워킹 디렉토리: `apps/server/`
- 프론트엔드 워킹 디렉토리: `apps/mobile/`
- 글자당 단어 수 제한 없음 — 조회 시 `order_by('?')[:2]` 로 랜덤 2개 선택
- 새 DB 테이블: `tbl_content_kanaexample` — Word 테이블 FK 없음, 독립 필드, `order` 필드 없음
- 중복 방지: `UniqueConstraint(fields=['kana', 'surface'])` — 같은 글자에 같은 단어 중복 삽입 방지
- `example_words` 원소: `{ surface: str, kanji: str, meaning: str }` (kanji는 없으면 빈 문자열)
- `_item_detail('kana', id)` 반환에 `example_words: list` 추가 (없으면 `[]`)
- 시드 커맨드 미작성 — 데이터는 외부 프로젝트에서 직접 삽입
- 프론트 타입 `QuizSetDetail.example_words?: KanaExampleWord[]` 옵셔널
- "사용 단어" 섹션은 `question.item_type === 'kana' && example_words.length > 0` 일 때만 표시
- 디자인 토큰 하드코딩 금지 — `useQuizTheme().colors`(`c`) 사용
- 새 npm 패키지 설치 금지 (TTS는 `react-native-tts` 기존 사용)
- `git commit` 실행 금지 — 커밋은 사용자가 직접

---

## 파일 구조

### 신규 생성
- `apps/server/content/migrations/0007_kanaexample.py` (makemigrations 자동 생성)
- `apps/server/learning/tests/test_kana_detail.py`

### 수정
- `apps/server/content/models.py` — `KanaExample` 모델 추가
- `apps/server/learning/services.py` — import 1줄 + `_item_detail` KANA 분기 교체
- `apps/mobile/src/api/quiz.ts` — `KanaExampleWord` 타입 + `QuizSetDetail.example_words` 추가
- `apps/mobile/src/screens/quiz/LockQuizScreen.tsx` — `AnswerReveal` 사용 단어 섹션 추가

---

### Task 1: KanaExample 모델 + 마이그레이션

**Files:**
- Modify: `apps/server/content/models.py`
- Create: `apps/server/content/migrations/0007_kanaexample.py` (makemigrations로 생성)
- Modify: `apps/server/content/tests.py`

**Interfaces:**
- Produces: `KanaExample` 모델
  - `kana`: FK → `Kana`, `on_delete=CASCADE`, `related_name='examples'`
  - `surface`: `CharField(max_length=20)` — 단어 가나 표기 (예: あか)
  - `kanji`: `CharField(max_length=20, blank=True)` — 한자 표기 (예: 赤, 없으면 '')
  - `meaning_ko`: `CharField(max_length=100)` — 한국어 뜻 (예: 빨강)
  - `order` 필드 없음
  - `Meta.db_table = 'tbl_content_kanaexample'`
  - `UniqueConstraint(fields=['kana', 'surface'], name='uniq_kanaexample_kana_surface')`
  - `Meta.ordering` 없음 (랜덤 조회이므로 기본 순서 불필요)

- [ ] **Step 1: 테스트 작성**

  `apps/server/content/tests.py` 를 아래로 교체:
  ```python
  from django.db import IntegrityError
  from django.test import TestCase

  from content.models import Kana, KanaExample


  class KanaExampleModelTest(TestCase):
      def setUp(self):
          self.kana = Kana.objects.create(character='あ', romaji='a', script='hira', kind='seion')

      def test_create_with_kanji(self):
          ex = KanaExample.objects.create(
              kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨강',
          )
          self.assertEqual(ex.surface, 'あか')
          self.assertEqual(ex.kanji, '赤')
          self.assertEqual(ex.meaning_ko, '빨강')

      def test_create_without_kanji(self):
          ex = KanaExample.objects.create(
              kana=self.kana, surface='あめ', kanji='', meaning_ko='비',
          )
          self.assertEqual(ex.kanji, '')

      def test_unique_kana_surface(self):
          KanaExample.objects.create(kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨강')
          with self.assertRaises(IntegrityError):
              KanaExample.objects.create(kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨간색')

      def test_many_words_per_kana(self):
          for i, (surface, kanji, meaning) in enumerate([
              ('あか', '赤', '빨강'), ('あお', '青', '파랑'),
              ('あめ', '雨', '비'), ('あし', '足', '발'),
          ]):
              KanaExample.objects.create(kana=self.kana, surface=surface, kanji=kanji, meaning_ko=meaning)
          self.assertEqual(KanaExample.objects.filter(kana=self.kana).count(), 4)

      def test_same_surface_different_kana_allowed(self):
          kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
          KanaExample.objects.create(kana=self.kana, surface='あか', kanji='赤', meaning_ko='빨강')
          # 다른 kana에 같은 surface — 허용
          KanaExample.objects.create(kana=kana2, surface='あか', kanji='赤', meaning_ko='빨강')
          self.assertEqual(KanaExample.objects.count(), 2)
  ```

- [ ] **Step 2: 테스트 실패 확인**

  ```bash
  cd apps/server && python manage.py test content.tests -v 2
  ```
  Expected: `ImportError: cannot import name 'KanaExample' from 'content.models'`

- [ ] **Step 3: 모델 추가**

  `apps/server/content/models.py` 파일 끝에 추가:
  ```python
  class KanaExample(models.Model):
      """가나 글자별 예시 단어 풀. 데이터는 외부 프로젝트에서 직접 삽입.

      조회 시 order_by('?')[:2] 로 랜덤 2개 선택 — 글자당 단어 수 제한 없음.
      """

      kana = models.ForeignKey(Kana, on_delete=models.CASCADE, related_name='examples')
      surface = models.CharField(max_length=20, help_text='단어 가나 표기 (예: あか)')
      kanji = models.CharField(max_length=20, blank=True, help_text='한자 표기 (예: 赤), 없으면 빈 문자열')
      meaning_ko = models.CharField(max_length=100, help_text='한국어 뜻 (예: 빨강)')

      class Meta:
          db_table = 'tbl_content_kanaexample'
          verbose_name = '가나 예시 단어'
          verbose_name_plural = '가나 예시 단어'
          constraints = [
              models.UniqueConstraint(
                  fields=['kana', 'surface'], name='uniq_kanaexample_kana_surface',
              ),
          ]

      def __str__(self):
          kanji_part = f'({self.kanji})' if self.kanji else ''
          return f'{self.kana.character} {self.surface}{kanji_part} : {self.meaning_ko}'
  ```

- [ ] **Step 4: 마이그레이션 생성**

  ```bash
  cd apps/server && python manage.py makemigrations content --name kanaexample
  ```
  Expected: `Migrations for 'content': content/migrations/0007_kanaexample.py`

- [ ] **Step 5: 마이그레이션 적용 + 테스트 통과 확인**

  ```bash
  cd apps/server && python manage.py migrate && python manage.py test content.tests -v 2
  ```
  Expected: 5 tests pass, 0 failures

---

### Task 2: 백엔드 _item_detail KANA 분기 수정

**Files:**
- Modify: `apps/server/learning/services.py` (import 1줄 + 함수 내 10줄 교체)
- Create: `apps/server/learning/tests/test_kana_detail.py`

**Interfaces:**
- Consumes: `KanaExample` (Task 1)
- Produces: `_item_detail('kana', id)` 반환 딕셔너리에 `example_words` 키 추가
  ```python
  'example_words': [
      {'surface': 'あか', 'kanji': '赤', 'meaning': '빨강'},
      {'surface': 'あお', 'kanji': '青', 'meaning': '파랑'},
  ]
  ```
  예시 없으면 `[]`. 풀이 2개 이상일 때 매 호출마다 다른 조합 가능 (`order_by('?')`).

- [ ] **Step 1: 테스트 작성**

  `apps/server/learning/tests/test_kana_detail.py` 생성:
  ```python
  from django.test import TestCase

  from content.models import Kana, KanaExample
  from learning.services import _item_detail


  class KanaDetailTest(TestCase):
      def setUp(self):
          self.kana = Kana.objects.create(character='あ', romaji='a', script='hira', kind='seion')
          for surface, kanji, meaning in [
              ('あか', '赤', '빨강'), ('あお', '青', '파랑'),
              ('あめ', '雨', '비'), ('あし', '足', '발'),
          ]:
              KanaExample.objects.create(kana=self.kana, surface=surface, kanji=kanji, meaning_ko=meaning)

      def test_returns_exactly_two(self):
          detail = _item_detail('kana', self.kana.id)
          self.assertIn('example_words', detail)
          self.assertEqual(len(detail['example_words']), 2)

      def test_example_words_structure(self):
          detail = _item_detail('kana', self.kana.id)
          for ex in detail['example_words']:
              self.assertIn('surface', ex)
              self.assertIn('kanji', ex)
              self.assertIn('meaning', ex)

      def test_words_belong_to_kana(self):
          valid_surfaces = {'あか', 'あお', 'あめ', 'あし'}
          detail = _item_detail('kana', self.kana.id)
          for ex in detail['example_words']:
              self.assertIn(ex['surface'], valid_surfaces)

      def test_no_examples_returns_empty_list(self):
          kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
          detail = _item_detail('kana', kana2.id)
          self.assertEqual(detail['example_words'], [])

      def test_existing_fields_preserved(self):
          detail = _item_detail('kana', self.kana.id)
          self.assertEqual(detail['surface'], 'あ')
          self.assertEqual(detail['reading'], 'a')
          self.assertEqual(detail['script'], 'hira')

      def test_kanji_empty_string_preserved(self):
          kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
          KanaExample.objects.create(kana=kana2, surface='いえ', kanji='', meaning_ko='집')
          detail = _item_detail('kana', kana2.id)
          self.assertEqual(detail['example_words'][0]['kanji'], '')

      def test_pool_smaller_than_two(self):
          kana2 = Kana.objects.create(character='い', romaji='i', script='hira', kind='seion')
          KanaExample.objects.create(kana=kana2, surface='いぬ', kanji='犬', meaning_ko='개')
          detail = _item_detail('kana', kana2.id)
          self.assertEqual(len(detail['example_words']), 1)
  ```

- [ ] **Step 2: 테스트 실패 확인**

  ```bash
  cd apps/server && python manage.py test learning.tests.test_kana_detail -v 2
  ```
  Expected: `AssertionError: 'example_words' not found in {...}`

- [ ] **Step 3: services.py 수정**

  `apps/server/learning/services.py` 16번째 줄 import를 아래로 교체:
  ```python
  from content.models import Kana, KanaExample, Kanji, Word, WordMeaning
  ```

  `_item_detail` 함수의 KANA 분기 (라인 89-102, `if item_type == ItemType.KANA:` 블록 전체)를 아래로 교체:
  ```python
  if item_type == ItemType.KANA:
      kana = Kana.objects.filter(id=item_id).first()
      if not kana:
          return {}
      examples = KanaExample.objects.filter(kana_id=item_id).order_by('?')[:2]
      example_words = [
          {'surface': ex.surface, 'kanji': ex.kanji, 'meaning': ex.meaning_ko}
          for ex in examples
      ]
      return {
          'surface': kana.character,
          'reading': kana.romaji,
          'meaning': kana.romaji,
          'components': '',
          'stroke_count': None,
          'on_reading': '',
          'kun_reading': '',
          'script': kana.script,
          'example_words': example_words,
      }
  ```

- [ ] **Step 4: 테스트 통과 + 전체 회귀 확인**

  ```bash
  cd apps/server && python manage.py test learning.tests.test_kana_detail -v 2 && python manage.py test learning -v 1
  ```
  Expected: 7 tests (test_kana_detail) + 기존 전체 통과

---

### Task 3: 프론트엔드 타입 + AnswerReveal 사용 단어 UI

**Files:**
- Modify: `apps/mobile/src/api/quiz.ts` (라인 40-50 근처)
- Modify: `apps/mobile/src/screens/quiz/LockQuizScreen.tsx` (AnswerReveal 함수)

**Interfaces:**
- Consumes:
  - `c` — `useQuizTheme().colors` (이미 import됨)
  - `withAlpha` (이미 import됨)
  - `AppText`, `PressableScale` (이미 import됨)
  - `Tts` from `react-native-tts` (이미 import됨)
- Produces: 가나 퀴즈 결과 패널 — 설명 카드와 다음 버튼 사이에 "사용 단어" 섹션

**UI 명세:**
```
사용 단어              ← AppText variant="caption", color=c.textTertiary, marginBottom=10

┌──────────┐ ┌──────────┐
│ あか      │ │ あお      │  ← surface: fontSize 22, bold, color=c.textPrimary
│ 赤        │ │ 青        │  ← kanji: caption, color=c.textTertiary (없으면 생략)
│ 빨강      │ │ 파랑      │  ← meaning: body, color=c.textSecondary
└──────────┘ └──────────┘
  ↑ 탭하면 Tts.speak(surface) 재생
```

- 카드 배경: `withAlpha(c.brand, 0.07)`
- 카드 border: `1px, withAlpha(c.brand, 0.15)`, `borderRadius=10`
- 섹션 컨테이너: 설명 카드와 동일 스타일 (surface bg, line border, radius 14, padding 14/12)
- 단어 2개일 때 `flex: 1` 로 균등 분할, `gap: 10`

- [ ] **Step 1: quiz.ts 타입 추가**

  `apps/mobile/src/api/quiz.ts` 의 `export type QuizSetDetail = {` 블록 바로 앞에 삽입:
  ```typescript
  export type KanaExampleWord = {
    surface: string;
    /** 한자 표기. 없으면 빈 문자열 */
    kanji: string;
    meaning: string;
  };
  ```

  `QuizSetDetail` 타입 맨 마지막 필드 (`script: ...;`) 뒤에 추가:
  ```typescript
    /** 가나 퀴즈 전용 — 랜덤 풀에서 선택된 예시 단어 최대 2개 */
    example_words?: KanaExampleWord[];
  ```

- [ ] **Step 2: TypeScript 컴파일 확인**

  ```bash
  cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
  ```
  Expected: 새로운 오류 없음

- [ ] **Step 3: AnswerReveal 사용 단어 섹션 삽입**

  `apps/mobile/src/screens/quiz/LockQuizScreen.tsx` 의 `AnswerReveal` 함수 내,
  설명 카드 닫는 `</View>` (라인 489 근처, `marginBottom: 12,` 가 있는 View) 와
  다음 버튼 `<PressableScale onPress={onNext}>` 사이에 아래를 삽입:

  ```tsx
  {/* ── 사용 단어 (가나 퀴즈 전용) ── */}
  {question.item_type === 'kana' && !!detail.example_words?.length && (
    <View style={{
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1, borderColor: c.line,
      paddingHorizontal: 14, paddingVertical: 12,
      marginBottom: 12,
    }}>
      <AppText variant="caption" style={{ color: c.textTertiary, marginBottom: 10 }}>
        사용 단어
      </AppText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {detail.example_words.map((ex) => (
          <PressableScale
            key={ex.surface}
            onPress={() => { Tts.speak(ex.surface); }}
            pressedScale={0.96}
            style={{ flex: 1 }}>
            <View style={{
              backgroundColor: withAlpha(c.brand, 0.07),
              borderRadius: 10,
              borderWidth: 1, borderColor: withAlpha(c.brand, 0.15),
              paddingHorizontal: 12, paddingVertical: 10,
              gap: 2,
            }}>
              <AppText style={{ color: c.textPrimary, fontSize: 22, fontWeight: '700', lineHeight: 28 }}>
                {ex.surface}
              </AppText>
              {!!ex.kanji && (
                <AppText variant="caption" style={{ color: c.textTertiary }}>
                  {ex.kanji}
                </AppText>
              )}
              {!!ex.meaning && (
                <AppText variant="body" style={{ color: c.textSecondary }}>
                  {ex.meaning}
                </AppText>
              )}
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  )}
  ```

- [ ] **Step 4: TypeScript 최종 확인**

  ```bash
  cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
  ```
  Expected: 새로운 오류 없음

---

## 프로덕션 배포 순서

1. 백엔드 이미지 빌드 & Cloud Run 배포
2. `migrate-job` 실행 (0007_kanaexample 적용)
3. 외부 프로젝트에서 `tbl_content_kanaexample` 직접 삽입
4. APK 빌드 (`assembleRelease -PreactNativeArchitectures=arm64-v8a`)

> 데이터 삽입 전에도 앱은 정상 동작 — `example_words=[]`이면 "사용 단어" 섹션 미표시.
