# 발음(TTS) 소스를 kun_reading으로 전환 — 설계

> 2026-07-31. 피드백 체크리스트 B의 "道·魚 훈독 누락", "단어면 발음도 보여줘야지" 대응.

## 배경

퀴즈 화면의 발음 표시와 듣기 버튼이 `Kanji.on_reading`만 쓰고 있었다. 훈독은
페이로드에 실려 오는데도 화면이 안 썼다. 그래서 道는 「ドウ」, 魚는 「ギョ」로만
읽히고 끝난다. 데이터 누락으로 추정했지만 실제로는 코드 문제였다.

단어는 서버가 `on_reading`을 항상 빈 문자열로 내려서, 결과 화면의
`!!detail.on_reading` 조건이 통과를 못 해 발음 줄이 통째로 안 뜬다.

여기에 더해 복수 발음 순차 재생이 동작하지 않았다. `useSpeak`은 `・`(U+30FB)로
쪼개는데 서버는 `' · '`(U+00B7)와 `' / '`로 합쳐서, 절대 갈라지지 않는다.

## 데이터 실측 (2,205자)

```
kun 있음 2,083 / on 있음 2,130
kun 없고 on만 있음      53자
둘 다 없음              69자

道  on=ドウ・トウ  kun=みち・*い（う）・*みちび（く）
高  on=コウ        kun=たか・たか（い）・たか（まる）・たか（める）
食  on=ショク・…   kun=く（う）・た（べる）・く（らう）・*は（む）
```

세 가지가 확인됐다.

1. **실제 구분자는 `・`(U+30FB)** — `useSpeak`의 split이 맞았고, 서버의 조인이 틀렸다.
2. **`（）`는 오쿠리가나.** `た（べる）`는 한자가 `た`까지고 `べる`는 딸린 히라가나.
   TTS에 그대로 넘기면 괄호를 읽고, 떼고 붙이면 `たべる`라는 실제 단어가 된다.
   → 표시용과 재생용 문자열이 달라야 한다.
3. **`*`는 표외음훈 마커.** kun이 **전부 `*`인 한자가 760자**(王·気·校·医·午 …).
   데이터 오류가 아니라 "상용 훈독이 없는 한자"라는 뜻이다.
   `on`에는 `*`도 괄호도 없고 `・`만 쓴다.

`*` 제거 후 읽기 개수 분포:

```
0개(전부 *) 760 · 1개 852 · 2개 308 · 3개 98 · 4개 47 · 5개+ 18
→ 상한 3개면 kun을 가진 한자의 95%가 손실 없이 다 담긴다
```

## 결정

- **kun 우선, kun이 없으면 on 폴백.** `*` 필터와 맞물려 760+53자가 자동으로 음독을 쓴다.
  音/訓 라벨은 붙이지 않는다 — 학습자에게 필요한 건 "뭐라고 읽나"지 분류가 아니다.
- **표시 3개 / 재생 3개.** 보이는 것과 들리는 것을 일치시킨다. 재생 최장 약 6초.
- **파싱은 서버에서 한 곳.** `・`·`*`·`（）`는 시드 데이터의 포맷이지 UI 관심사가 아니다.
  이번 버그 자체가 서버와 클라이언트가 각자 구분자를 정해서 생긴 일이라,
  파싱 지점을 하나로 접어 재발을 막는다.

## 서버

### `content/readings.py` (신규) — 발음 문자열에 대한 유일한 지식

```python
def parse_readings(raw: str, limit: int = 3) -> list[dict]:
    """'たか・たか（い）・*たか（める）' → [{'display','speak'}, …]"""
```

1. `・`(U+30FB)로 자른다
2. `*`로 시작하는 항목은 버린다 (표외음훈)
3. `display` = 원문 그대로 (괄호 유지 — 어디까지가 한자 몫인지 보여야 한다)
4. `speak` = `（）`를 떼고 이어붙임: `た（べる）` → `たべる`
5. 앞에서 `limit`개까지

```python
def kanji_readings(kanji) -> list[dict]:
    return parse_readings(kanji.kun_reading) or parse_readings(kanji.on_reading)
```

`or`가 폴백이다. kun이 비었거나 전부 `*`였으면 on으로 넘어간다.

### 페이로드

`learning/services.py`의 `_item_detail`에서 `on_reading`·`kun_reading`을 **빼고**
`readings`를 넣는다.

```diff
- 'on_reading': kanji.on_reading,
- 'kun_reading': kanji.kun_reading,
+ 'readings': kanji_readings(kanji),   # [{'display':'た（べる）','speak':'たべる'}, …]
```

`_item_extra`의 한자 분기도 `' · '.join(display)`로 바꾼다.

`QuizSetItem.reading`(DB 컬럼)은 **건드리지 않는다.** 문제 화면 상단 한 줄용
표시 문자열이고, 마이그레이션 없이 내용만 바뀐다. 단발 `/next/` 경로는 `detail`이
없어서 이 컬럼이 필요하다. 뜻→단어 방향에서 비우는 규칙(정답 힌트 방지)은 유지.

`content/services.py`의 구성 트리 노드도 같은 헬퍼를 써서
`on_reading`/`kun_reading` → `readings`로 바꾼다.

## 클라이언트

### `useSpeak(text: string)` → `useSpeak(readings: string[])`

내부 `split('・')`이 사라진다. 순차 재생·토글·취소 로직은 그대로. 구분자 지식이
클라이언트에서 완전히 없어지는 것이 이번 변경의 요점이다.

### `lib/readingView.ts` (신규) — 표시/재생 선택 순수함수

호출부가 6군데라 각자 삼항연산자를 쓰면 또 어긋난다.

```ts
readingLine(detail): string      // 화면에 적을 발음 한 줄
speakList(detail): string[]      // 듣기 버튼이 읽을 목록
```

| 항목 | `readingLine` | `speakList` |
|---|---|---|
| 한자 | `readings.map(display).join(' · ')` | `readings.map(speak)` |
| 단어 | `detail.reading` (= `word.reading`) | `[detail.reading]` |
| 가나 | `detail.reading` (= romaji) | `[detail.surface]` |

단어 행이 "단어면 발음도 보여줘야지" 대응이다. 결과 화면이 `detail.on_reading`
대신 `readingLine`을 쓰면서 해결된다.

가나 재생만 `surface`로 바꿨다. 기존에는 로마자 `"kya"`를 `ja-JP` TTS에 넘기고
있었다. 이 함수를 새로 쓰면서 지나가는 자리라 잘못된 채로 옮기지 않았다.

### 호출부 6곳

문제 화면 상단(`LockQuizScreen:1139`) · 문제 듣기(`:1163`) · 결과 표시(`:475`) ·
결과 듣기(`:489`) · 오답노트(`QuizReviewModal:145·229·235`) · 구성 트리(`NodeRow:124`).

예문·가나 예시 단어·가나표는 소스가 원래 `WordExample.reading` /
`KanaExample.surface` / `Kana.character`라 그대로고, `useSpeak` 시그니처만 맞춘다.

### 오프라인 캐시

깨지지 않고 낡는다. MMKV에 남은 이전 세트에는 `readings`가 없어 `detail.reading`으로
떨어지고, 한자면 예전 `"コウ / たか-い"` 문자열이 한 덩어리로 표시·재생된다.
세트는 새벽 3시에 리셋되니 하루 안에 사라진다 — 마이그레이션할 가치가 없다.

## 테스트

- 서버 `content/tests/test_readings.py` — `*` 필터, 괄호 제거, 3개 상한, kun→on 폴백,
  빈 입력. 추가로 실 데이터를 훑어 **결과에 `*`나 `（`가 절대 남지 않는지** 확인하는
  스윕 하나(시드 포맷이 바뀌면 여기서 잡힌다).
- 클라이언트 `__tests__/readingView.test.ts` — 한자/단어/가나 3분기 +
  `readings`가 없는 구버전 페이로드 폴백.
