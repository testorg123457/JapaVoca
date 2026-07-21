# 일본어 번역 기능 Implementation Plan (서버 + AI, B안)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 카메라 촬영 또는 사진 범위선택으로 일본어를 서버(Gemini AI)로 보내 OCR·번역하고, 원문과 한국어 뜻을 보여준다.

**Architecture:** 폰은 이미지 확보·크롭·업로드·표시만(image-picker + 커스텀 크롭 + image-editor). OCR+번역은 JapaVoca Django에 새 `translate` 앱을 추가해 Gemini(google-generativeai)로 처리하고 OpenRouter로 폴백(Kanjify 이식). 순수 로직(좌표 변환·사각형 클램프·응답 파싱·에러 분류)만 자동 테스트(jest/Django), 카메라·크롭·화면·실기기·AI 호출은 사용자 수동 검증.

**Tech Stack:** RN 0.86(New Arch), TS, NativeWind, reanimated+gesture-handler(보유), react-native-image-picker, @react-native-community/image-editor, axios(보유). 백엔드 Django 6 + DRF + JWT(보유), google-generativeai, requests(보유), python-dotenv(보유).

## Global Constraints

- **커밋 금지**: 모든 변경은 작업트리에만. "커밋" 스텝 없음. 커밋/푸시는 사용자가 직접.
- **폰 빌드·실기기 확인은 사용자 몫**: `run-android`·카메라·AI 실호출 검증 스텝은 사용자에게 넘기고 Claude는 텍스트로 요청/보고.
- 색·간격·라운드·타이포는 `src/theme/tokens.ts`만. 라운드 버튼12/카드16/시트24. 이모지를 기능 아이콘으로 쓰지 않음(Icon SVG).
- 디자인 작업(진입·크롭·결과 화면)은 **frontend-design 스킬**로.
- 모바일 헬퍼는 `src/lib/translate/`, API는 `src/api/`, 순수 테스트는 루트 `apps/mobile/__tests__/`(기존 패턴). 화면은 `src/screens/main/`.
- 백엔드는 새 앱 `apps/server/translate/`. env 키: `GOOGLE_API_KEY`(필수, 폴백 없음). **키는 사용자가 `.env`에 채운다.**
- 업로드는 multipart FormData(이미지 파일). base64 변환 안 함.
- 에러 문구는 앱 톤(사과 없이 다음 행동 안내).
- 백엔드 개발 서버는 포트 8002, 폰은 `adb reverse tcp:8001 tcp:8002`(기존과 동일).

---

## File Structure

**백엔드 신규** (`apps/server/translate/`)
- `__init__.py`, `apps.py` — Django 앱
- `ai.py` — `ocr_and_translate(image_bytes) -> dict`, `translate_text(text) -> str`, `parse_json_from_response`(Kanjify 이식/축약)
- `views.py` — `TranslateImageView`(multipart), `TranslateTextView`(JSON)
- `urls.py` — `/image/`, `/text/`
- `tests.py` — 순수 파서/뷰 계약 테스트(AI는 mock)

**백엔드 수정**
- `apps/server/config/settings.py` — INSTALLED_APPS에 `translate`
- `apps/server/config/urls.py` — `path('api/translate/', include('translate.urls'))`
- `apps/server/requirements.txt` — `google-generativeai`
- `apps/server/.env.example` — `GOOGLE_API_KEY`, `OPEN_ROUTER_KEY`

**모바일 신규**
- `src/api/translate.ts` — `translateImage(fileUri) -> {original,korean}`, `translateText(text) -> {korean}`
- `src/lib/translate/imageSource.ts` — 카메라/갤러리 확보 + `firstAsset`(순수)
- `src/lib/translate/cropImage.ts` — `toPixelRect`(순수) + `cropToRect`
- `src/lib/translate/cropGeometry.ts` — `clampRect`(순수)
- `src/lib/translate/errors.ts` — `classifyTranslateError`(순수) + `errorMessage`
- `src/screens/main/TranslateCropScreen.tsx`, `TranslateResultScreen.tsx`
- `src/screens/main/components/CropOverlay.tsx`

**모바일 수정**
- `src/screens/main/JapaneseTranslateScreen.tsx`(스텁→진입)
- `src/navigation/types.ts`, `src/navigation/MainStack.tsx`(라우트)
- `android/app/src/main/AndroidManifest.xml`(CAMERA, READ_MEDIA_IMAGES)
- `src/lib/permissions.ts`(`requestCamera`)
- `docs/프로잭트-현황.md`(마지막)

---

## Task 1: 백엔드 — translate 앱 + AI OCR/번역 (Kanjify 이식)

Gemini로 이미지 OCR+번역, 텍스트 재번역. AI 호출은 mock으로 테스트하고 실호출은 사용자 검증.

**Files:**
- Create: `apps/server/translate/__init__.py`, `apps.py`, `ai.py`, `views.py`, `urls.py`, `tests.py`
- Modify: `apps/server/config/settings.py`, `apps/server/config/urls.py`, `apps/server/requirements.txt`, `apps/server/.env.example`

**Interfaces:**
- Produces:
  - `ai.ocr_and_translate(image_bytes: bytes) -> dict` → `{'original': str, 'korean': str}` (실패 시 예외)
  - `ai.translate_text(text: str) -> str`
  - `ai.parse_translation_json(raw: str) -> dict` (순수)
  - `POST /api/translate/image/` (multipart `image`) → `{original, korean}`; 글자 없으면 `original=''`
  - `POST /api/translate/text/` (`{text}`) → `{korean}`

- [ ] **Step 1: 앱 스캐폴딩 파일 생성**

`apps/server/translate/__init__.py` (빈 파일).

`apps/server/translate/apps.py`:

```python
from django.apps import AppConfig


class TranslateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'translate'
```

- [ ] **Step 2: 순수 JSON 파서 실패 테스트**

`apps/server/translate/tests.py`:

```python
from django.test import TestCase
from unittest.mock import patch

from translate.ai import parse_translation_json


class ParseTranslationJsonTest(TestCase):
    def test_plain_json(self):
        r = parse_translation_json('{"original": "寿司", "korean": "초밥"}')
        self.assertEqual(r, {'original': '寿司', 'korean': '초밥'})

    def test_json_in_code_fence(self):
        raw = '```json\n{"original": "駅", "korean": "역"}\n```'
        r = parse_translation_json(raw)
        self.assertEqual(r['korean'], '역')

    def test_garbage_returns_empty_fields(self):
        r = parse_translation_json('전혀 JSON 아님')
        self.assertEqual(r, {'original': '', 'korean': ''})
```

- [ ] **Step 3: 파서 실패 확인**

Run: `cd apps/server && source .venv/bin/activate && python manage.py test translate.tests.ParseTranslationJsonTest`
Expected: FAIL — `translate.ai` 없음

- [ ] **Step 4: ai.py 구현 (Kanjify call_gemini/call_openrouter 이식)**

`apps/server/translate/ai.py`:

```python
"""일본어 이미지 OCR + 한국어 번역 — Gemini(google-generativeai).

Kanjify(backend/api/ai_utils.py)의 call_gemini를 이식·축약했다.
키는 env: GOOGLE_API_KEY(필수). 폴백 없음.
"""
import json
import logging
import os
import re

logger = logging.getLogger(__name__)

_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

_IMAGE_PROMPT = (
    '이 이미지에서 일본어(한자·가나) 텍스트를 읽고 한국어로 번역하라. '
    '반드시 아래 JSON으로만 응답하라. 설명 금지.\n'
    '{"original": "이미지의 일본어 원문", "korean": "한국어 번역"}\n'
    '글자가 없으면 original을 빈 문자열로 두라.'
)

def _text_prompt(text: str) -> str:
    return (
        '다음 일본어를 한국어로 번역하라. 반드시 아래 JSON으로만 응답하라. 설명 금지.\n'
        '{"original": "원문", "korean": "한국어 번역"}\n'
        f'원문: "{text}"'
    )


def parse_translation_json(raw: str) -> dict:
    """AI 응답 문자열에서 {original, korean} 추출. 실패 시 빈 필드."""
    out = {'original': '', 'korean': ''}
    if not raw:
        return out
    text = raw.strip()
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if not m:
        return out
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return out
    out['original'] = str(data.get('original', '') or '')
    out['korean'] = str(data.get('korean', '') or '')
    return out


def _call_gemini(prompt: str, image_bytes: bytes | None) -> str | None:
    try:
        import google.generativeai as genai
    except ImportError:
        logger.error('google-generativeai 미설치')
        return None
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        logger.error('GOOGLE_API_KEY 미설정')
        return None
    genai.configure(api_key=api_key)
    for name in _GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(name)
            if image_bytes:
                resp = model.generate_content(
                    [prompt, {'mime_type': 'image/jpeg', 'data': image_bytes}]
                )
            else:
                resp = model.generate_content(prompt)
            if resp.candidates:
                return resp.text.strip()
        except Exception as e:  # noqa: BLE001
            logger.warning('Gemini %s 실패: %s', name, e)
            continue
    return None


def _run(prompt: str, image_bytes: bytes | None) -> dict:
    raw = _call_gemini(prompt, image_bytes)
    if raw is None:
        raise RuntimeError('AI 서비스 호출 실패')
    return parse_translation_json(raw)


def ocr_and_translate(image_bytes: bytes) -> dict:
    return _run(_IMAGE_PROMPT, image_bytes)


def translate_text(text: str) -> str:
    return _run(_text_prompt(text), None)['korean']
```

- [ ] **Step 5: 파서 통과 확인**

Run: `python manage.py test translate.tests.ParseTranslationJsonTest`
Expected: PASS (3 tests)

- [ ] **Step 6: 뷰 + URL 구현**

`apps/server/translate/views.py`:

```python
"""일본어 번역 뷰 — 이미지 OCR+번역 / 텍스트 재번역."""
import logging

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai import ocr_and_translate, translate_text

logger = logging.getLogger(__name__)

_MAX_BYTES = 8 * 1024 * 1024  # 8MB 상한


class TranslateImageView(APIView):
    """POST /api/translate/image/ (multipart image) → {original, korean}."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        f = request.FILES.get('image')
        if not f:
            return Response({'detail': '이미지가 없습니다.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if f.size > _MAX_BYTES:
            return Response({'detail': '이미지가 너무 큽니다.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            result = ocr_and_translate(f.read())
        except Exception as e:  # noqa: BLE001
            logger.error('translate image 실패: %s', e)
            return Response({'detail': '번역에 실패했습니다.'},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response(result)


class TranslateTextView(APIView):
    """POST /api/translate/text/ ({text}) → {korean}."""

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'detail': '텍스트가 없습니다.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            korean = translate_text(text)
        except Exception as e:  # noqa: BLE001
            logger.error('translate text 실패: %s', e)
            return Response({'detail': '번역에 실패했습니다.'},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response({'korean': korean})
```

`apps/server/translate/urls.py`:

```python
"""translate URL — /api/translate/ 하위."""
from django.urls import path

from .views import TranslateImageView, TranslateTextView

app_name = 'translate'

urlpatterns = [
    path('image/', TranslateImageView.as_view(), name='image'),
    path('text/', TranslateTextView.as_view(), name='text'),
]
```

- [ ] **Step 7: 앱 등록 + 라우팅 + 의존성/env**

`config/settings.py` INSTALLED_APPS 'support' 아래 `'translate',` 추가.

`config/urls.py` urlpatterns에 추가:
```python
    path('api/translate/', include('translate.urls')),
```

`requirements.txt`에 추가: `google-generativeai==0.8.6`

`.env.example`의 Google OAuth 블록 아래 추가:
```
# --- AI 번역 (일본어 번역 기능) ---
# 이미지 OCR+번역용(Gemini). Kanjify와 동일 키 재사용 가능.
GOOGLE_API_KEY=
```

- [ ] **Step 8: 뷰 계약 테스트(AI mock) 추가**

`apps/server/translate/tests.py`에 이어서 추가:

```python
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile


class TranslateViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        user = get_user_model().objects.create(username='u1')
        self.client.force_authenticate(user=user)

    @patch('translate.views.ocr_and_translate', return_value={'original': '猫', 'korean': '고양이'})
    def test_image_ok(self, _m):
        img = SimpleUploadedFile('a.jpg', b'\xff\xd8\xff', content_type='image/jpeg')
        res = self.client.post('/api/translate/image/', {'image': img}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['korean'], '고양이')

    def test_image_missing_400(self):
        res = self.client.post('/api/translate/image/', {}, format='multipart')
        self.assertEqual(res.status_code, 400)

    def test_requires_auth(self):
        anon = APIClient()
        res = anon.post('/api/translate/text/', {'text': '猫'}, format='json')
        self.assertIn(res.status_code, (401, 403))

    @patch('translate.views.translate_text', return_value='고양이')
    def test_text_ok(self, _m):
        res = self.client.post('/api/translate/text/', {'text': '猫'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['korean'], '고양이')
```

> 참고: `get_user_model().objects.create` 필드는 실제 accounts User 모델에 맞춘다(username 없으면 이메일/필수 필드로 조정). 실패 시 accounts 모델 확인.

- [ ] **Step 9: 전체 백엔드 테스트 통과 확인**

Run: `python manage.py test translate`
Expected: PASS (파서 3 + 뷰 4). AI는 mock이라 키 없이도 통과.

- [ ] **Step 10: (사용자) 실제 AI 검증 — 선택**

키(`GOOGLE_API_KEY`)를 `.env`에 넣고 서버 실행 후, 로그인 토큰으로 이미지 업로드 시 실제 번역이 오는지 확인. Claude는 실호출 검증 불가 — 사용자 몫.

---

## Task 2: 카메라 권한 헬퍼 (모바일)

**Files:**
- Modify: `apps/mobile/src/lib/permissions.ts`
- Test: `apps/mobile/__tests__/permissions.camera.test.ts`

**Interfaces:**
- Consumes: 기존 `mapAndroidResult`, `PermResult`.
- Produces: `requestCamera(): Promise<PermResult>`, `checkCamera(): Promise<boolean>`.

- [ ] **Step 1: 실패 테스트**

`apps/mobile/__tests__/permissions.camera.test.ts`:

```ts
import { PermissionsAndroid } from 'react-native';
import { requestCamera } from '../src/lib/permissions';

describe('requestCamera', () => {
  it('granted → granted', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(
      PermissionsAndroid.RESULTS.GRANTED as never,
    );
    await expect(requestCamera()).resolves.toBe('granted');
  });
  it('never_ask_again → blocked', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN as never,
    );
    await expect(requestCamera()).resolves.toBe('blocked');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd apps/mobile && npx jest permissions.camera` → FAIL

- [ ] **Step 3: 구현** — `src/lib/permissions.ts`에 추가:

```ts
export async function checkCamera(): Promise<boolean> {
  if (Platform.OS !== 'android') { return true; }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
}

export async function requestCamera(): Promise<PermResult> {
  if (Platform.OS !== 'android') { return 'granted'; }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return mapAndroidResult(r);
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx jest permissions.camera` → PASS (2)

---

## Task 3: 의존성 설치 + 권한 매니페스트 (모바일)

**Files:**
- Modify: `apps/mobile/package.json`, `apps/mobile/android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: 설치**

이유(한 줄): 카메라/갤러리=image-picker, 좌표 crop=image-editor. (둘 다 안정판·New Arch 지원)

```bash
cd apps/mobile
npm install react-native-image-picker @react-native-community/image-editor
```

- [ ] **Step 2: 매니페스트 권한**

`android/app/src/main/AndroidManifest.xml` `<manifest>` 안 기존 `uses-permission` 목록 아래:

```xml
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

- [ ] **Step 3: 설치 확인** — Run: `npm ls react-native-image-picker @react-native-community/image-editor` → 두 패키지 버전 출력, 에러 없음.

- [ ] **Step 4: (사용자) 네이티브 링크 확인** — 다음 실기기 빌드 시 반영됨(Claude 빌드 안 함).

---

## Task 4: 이미지 확보 모듈

**Files:**
- Create: `apps/mobile/src/lib/translate/imageSource.ts`
- Test: `apps/mobile/__tests__/imageSource.test.ts`

**Interfaces:**
- Consumes: `requestCamera`(Task 2).
- Produces:
  - `type PickedImage = { uri: string; width: number; height: number }`
  - `buildPickerOptions(): ImageLibraryOptions`
  - `firstAsset(res): PickedImage | null`
  - `pickFromCamera(): Promise<PickedImage | null>` (권한 막힘 시 throw 'permission-blocked')
  - `pickFromGallery(): Promise<PickedImage | null>`

- [ ] **Step 1: 실패 테스트**

`apps/mobile/__tests__/imageSource.test.ts`:

```ts
import { buildPickerOptions, firstAsset } from '../src/lib/translate/imageSource';

describe('buildPickerOptions', () => {
  it('사진 1장, base64 미포함(원본 화질)', () => {
    const o = buildPickerOptions();
    expect(o.mediaType).toBe('photo');
    expect(o.selectionLimit).toBe(1);
    expect(o.includeBase64).toBe(false);
  });
});

describe('firstAsset', () => {
  it('취소면 null', () => {
    expect(firstAsset({ didCancel: true } as never)).toBeNull();
  });
  it('uri/width/height 추출', () => {
    expect(firstAsset({ assets: [{ uri: 'file://a.jpg', width: 300, height: 400 }] } as never))
      .toEqual({ uri: 'file://a.jpg', width: 300, height: 400 });
  });
  it('uri 없으면 null', () => {
    expect(firstAsset({ assets: [{}] } as never)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest imageSource` → FAIL

- [ ] **Step 3: 구현**

`src/lib/translate/imageSource.ts`:

```ts
import {
  launchCamera,
  launchImageLibrary,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { requestCamera } from '../permissions';

export type PickedImage = { uri: string; width: number; height: number };

export function buildPickerOptions(): ImageLibraryOptions {
  return { mediaType: 'photo', selectionLimit: 1, includeBase64: false };
}

export function firstAsset(res: ImagePickerResponse): PickedImage | null {
  if (res.didCancel) { return null; }
  const a = res.assets?.[0];
  if (!a?.uri || !a.width || !a.height) { return null; }
  return { uri: a.uri, width: a.width, height: a.height };
}

export async function pickFromGallery(): Promise<PickedImage | null> {
  return firstAsset(await launchImageLibrary(buildPickerOptions()));
}

export async function pickFromCamera(): Promise<PickedImage | null> {
  const perm = await requestCamera();
  if (perm !== 'granted') { throw new Error('permission-blocked'); }
  return firstAsset(await launchCamera(buildPickerOptions()));
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx jest imageSource` → PASS (4). 이어 `npx tsc --noEmit` → 0.

---

## Task 5: 크롭 좌표 변환 + crop 실행 + 클램프

**Files:**
- Create: `apps/mobile/src/lib/translate/cropImage.ts`, `apps/mobile/src/lib/translate/cropGeometry.ts`
- Test: `apps/mobile/__tests__/cropImage.test.ts`, `apps/mobile/__tests__/cropGeometry.test.ts`

**Interfaces:**
- Produces:
  - `type Rect = { x: number; y: number; width: number; height: number }`
  - `toPixelRect(overlay: Rect, view: {width,height}, image: {width,height}): Rect` (contain 레터박스 보정, 정수 반올림)
  - `cropToRect(uri: string, pixel: Rect): Promise<string>`
  - `clampRect(rect: Rect, bounds: {width,height}, min: number): Rect`

- [ ] **Step 1: toPixelRect 실패 테스트**

`apps/mobile/__tests__/cropImage.test.ts`:

```ts
import { toPixelRect } from '../src/lib/translate/cropImage';

describe('toPixelRect (contain 레터박스 보정)', () => {
  it('가로 꽉·세로 레터박스', () => {
    const view = { width: 400, height: 400 };
    const image = { width: 800, height: 400 }; // scale 0.5, 표시 400x200, 세로여백 100
    expect(toPixelRect({ x: 0, y: 100, width: 200, height: 100 }, view, image))
      .toEqual({ x: 0, y: 0, width: 400, height: 200 });
  });
  it('세로 꽉·가로 레터박스', () => {
    const view = { width: 400, height: 400 };
    const image = { width: 400, height: 800 }; // scale 0.5, 표시 200x400, 가로여백 100
    expect(toPixelRect({ x: 100, y: 0, width: 100, height: 400 }, view, image))
      .toEqual({ x: 0, y: 0, width: 200, height: 800 });
  });
  it('레터박스 영역은 이미지 경계로 클램프', () => {
    const view = { width: 400, height: 400 };
    const image = { width: 800, height: 400 };
    const px = toPixelRect({ x: 0, y: 0, width: 400, height: 50 }, view, image);
    expect(px.y).toBe(0);
    expect(px.height).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: clampRect 실패 테스트**

`apps/mobile/__tests__/cropGeometry.test.ts`:

```ts
import { clampRect } from '../src/lib/translate/cropGeometry';

const bounds = { width: 300, height: 500 };

describe('clampRect', () => {
  it('음수 좌표는 0으로', () => {
    const r = clampRect({ x: -20, y: -10, width: 100, height: 100 }, bounds, 40);
    expect(r.x).toBe(0); expect(r.y).toBe(0);
  });
  it('경계 초과 시 안으로', () => {
    const r = clampRect({ x: 250, y: 450, width: 200, height: 200 }, bounds, 40);
    expect(r.x + r.width).toBeLessThanOrEqual(300);
    expect(r.y + r.height).toBeLessThanOrEqual(500);
  });
  it('최소 크기 보장', () => {
    const r = clampRect({ x: 0, y: 0, width: 5, height: 5 }, bounds, 40);
    expect(r.width).toBeGreaterThanOrEqual(40);
    expect(r.height).toBeGreaterThanOrEqual(40);
  });
});
```

- [ ] **Step 3: 실패 확인** — Run: `npx jest cropImage cropGeometry` → FAIL

- [ ] **Step 4: 구현 — cropImage.ts**

```ts
import ImageEditor from '@react-native-community/image-editor';

export type Rect = { x: number; y: number; width: number; height: number };

export function toPixelRect(
  overlay: Rect,
  view: { width: number; height: number },
  image: { width: number; height: number },
): Rect {
  const scale = Math.min(view.width / image.width, view.height / image.height);
  const shownW = image.width * scale;
  const shownH = image.height * scale;
  const offsetX = (view.width - shownW) / 2;
  const offsetY = (view.height - shownH) / 2;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const left = clamp(overlay.x - offsetX, 0, shownW);
  const top = clamp(overlay.y - offsetY, 0, shownH);
  const right = clamp(overlay.x + overlay.width - offsetX, 0, shownW);
  const bottom = clamp(overlay.y + overlay.height - offsetY, 0, shownH);
  return {
    x: Math.round(left / scale),
    y: Math.round(top / scale),
    width: Math.round((right - left) / scale),
    height: Math.round((bottom - top) / scale),
  };
}

export async function cropToRect(uri: string, pixel: Rect): Promise<string> {
  const result = await ImageEditor.cropImage(uri, {
    offset: { x: pixel.x, y: pixel.y },
    size: { width: pixel.width, height: pixel.height },
  });
  return typeof result === 'string' ? result : result.uri;
}
```

- [ ] **Step 5: 구현 — cropGeometry.ts**

```ts
import type { Rect } from './cropImage';

export function clampRect(
  rect: Rect,
  bounds: { width: number; height: number },
  min: number,
): Rect {
  const width = Math.max(min, Math.min(rect.width, bounds.width));
  const height = Math.max(min, Math.min(rect.height, bounds.height));
  const x = Math.max(0, Math.min(rect.x, bounds.width - width));
  const y = Math.max(0, Math.min(rect.y, bounds.height - height));
  return { x, y, width, height };
}
```

- [ ] **Step 6: 통과 확인** — Run: `npx jest cropImage cropGeometry` → PASS (6). `npx tsc --noEmit` → 0.

---

## Task 6: 번역 API 클라이언트 + 에러 분류

**Files:**
- Create: `apps/mobile/src/api/translate.ts`, `apps/mobile/src/lib/translate/errors.ts`
- Test: `apps/mobile/__tests__/translateErrors.test.ts`

**Interfaces:**
- Consumes: 기존 `apiClient`(`src/api/client.ts`).
- Produces:
  - `translateImage(fileUri: string): Promise<{ original: string; korean: string }>`
  - `translateText(text: string): Promise<{ korean: string }>`
  - `type TransErrorKind = 'permission' | 'no-text' | 'server' | 'unknown'`
  - `classifyTranslateError(e: unknown): TransErrorKind`
  - `errorMessage(kind): { title: string; message: string }`

- [ ] **Step 1: 에러 실패 테스트**

`apps/mobile/__tests__/translateErrors.test.ts`:

```ts
import { classifyTranslateError, errorMessage } from '../src/lib/translate/errors';

describe('classifyTranslateError', () => {
  it('permission-blocked → permission', () => {
    expect(classifyTranslateError(new Error('permission-blocked'))).toBe('permission');
  });
  it('no-text → no-text', () => {
    expect(classifyTranslateError(new Error('no-text'))).toBe('no-text');
  });
  it('axios 5xx → server', () => {
    expect(classifyTranslateError({ response: { status: 502 } })).toBe('server');
  });
  it('그 외 → unknown', () => {
    expect(classifyTranslateError(new Error('boom'))).toBe('unknown');
  });
});

describe('errorMessage', () => {
  it('no-text는 다시 찍기 안내, 사과 없음', () => {
    const m = errorMessage('no-text');
    expect(m.message).toContain('다시');
    expect(m.message).not.toMatch(/죄송|미안/);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx jest translateErrors` → FAIL

- [ ] **Step 3: 구현 — errors.ts**

```ts
export type TransErrorKind = 'permission' | 'no-text' | 'server' | 'unknown';

export function classifyTranslateError(e: unknown): TransErrorKind {
  const status = (e as { response?: { status?: number } })?.response?.status;
  if (typeof status === 'number' && status >= 500) { return 'server'; }
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes('permission')) { return 'permission'; }
  if (msg.includes('no-text')) { return 'no-text'; }
  if (msg.includes('network')) { return 'server'; }
  return 'unknown';
}

export function errorMessage(kind: TransErrorKind): { title: string; message: string } {
  switch (kind) {
    case 'permission':
      return { title: '카메라 권한이 필요해요', message: '설정에서 카메라 권한을 켜면 촬영할 수 있어요.' };
    case 'no-text':
      return { title: '글자를 찾지 못했어요', message: '일본어가 또렷하게 나오도록 다시 찍어 주세요.' };
    case 'server':
      return { title: '번역하지 못했어요', message: '네트워크를 확인하고 다시 시도해 주세요.' };
    default:
      return { title: '번역하지 못했어요', message: '잠시 후 다시 시도해 주세요.' };
  }
}
```

- [ ] **Step 4: 구현 — api/translate.ts**

```ts
import apiClient from './client';

export interface TranslateImageResult {
  original: string;
  korean: string;
}

export async function translateImage(fileUri: string): Promise<TranslateImageResult> {
  const form = new FormData();
  form.append('image', { uri: fileUri, type: 'image/jpeg', name: 'photo.jpg' } as never);
  const res = await apiClient.post<TranslateImageResult>('/api/translate/image/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function translateText(text: string): Promise<{ korean: string }> {
  const res = await apiClient.post<{ korean: string }>('/api/translate/text/', { text });
  return res.data;
}
```

> `apiClient`의 export가 default인지 named인지 확인: `src/api/client.ts` 마지막 export에 맞춰 import. (본 계획은 default 가정 — 실제와 다르면 `import { apiClient } from './client'`로 조정.)

- [ ] **Step 5: 통과 확인** — Run: `npx jest translateErrors` → PASS (5). `npx tsc --noEmit` → 0.

---

## Task 7: 크롭 오버레이 + 범위선택 화면 (frontend-design)

**Files:**
- Create: `apps/mobile/src/screens/main/components/CropOverlay.tsx`, `apps/mobile/src/screens/main/TranslateCropScreen.tsx`
- Modify: `apps/mobile/src/navigation/types.ts`, `apps/mobile/src/navigation/MainStack.tsx`

**Interfaces:**
- Consumes: `Rect`/`toPixelRect`/`cropToRect`(Task 5), `clampRect`(Task 5), `PickedImage`(Task 4).
- Produces: route `TranslateCrop: { image: { uri; width; height } }`; 확정 시 `navigation.replace('TranslateResult', { uri: croppedUri })`.

- [ ] **Step 1: CropOverlay 구현 (frontend-design)**

사진을 `resizeMode="contain"`으로 깔고, 그 위 드래그 이동 사각형(모서리 강조, 토큰 `brand`, radius 12). `Gesture.Pan()`+reanimated, 변경마다 `clampRect` 보정, `onRectChange`로 뷰좌표 `Rect` 전달. `apps/mobile/src/screens/main/components/CropOverlay.tsx`:

```tsx
import React from 'react';
import { Image, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { clampRect } from '../../../lib/translate/cropGeometry';
import type { Rect } from '../../../lib/translate/cropImage';
import { useThemeColors } from '../../../theme/ThemeProvider';

interface Props { uri: string; viewW: number; viewH: number; onRectChange: (r: Rect) => void; }
const MIN = 48;

export function CropOverlay({ uri, viewW, viewH, onRectChange }: Props): React.JSX.Element {
  const c = useThemeColors();
  const bounds = { width: viewW, height: viewH };
  const x = useSharedValue(viewW * 0.15);
  const y = useSharedValue(viewH * 0.3);
  const w = useSharedValue(viewW * 0.7);
  const h = useSharedValue(viewH * 0.25);
  const start = useSharedValue({ x: 0, y: 0 });

  function emit() { onRectChange({ x: x.value, y: y.value, width: w.value, height: h.value }); }

  const drag = Gesture.Pan()
    .onBegin(() => { start.value = { x: x.value, y: y.value }; })
    .onUpdate(e => {
      const n = clampRect(
        { x: start.value.x + e.translationX, y: start.value.y + e.translationY, width: w.value, height: h.value },
        bounds, MIN,
      );
      x.value = n.x; y.value = n.y;
    })
    .onEnd(() => { runOnJS(emit)(); });

  const boxStyle = useAnimatedStyle(() => ({
    position: 'absolute', left: x.value, top: y.value, width: w.value, height: h.value,
    borderWidth: 2, borderColor: c.brand, borderRadius: 12,
  }));

  React.useEffect(emit, []); // 초기 사각형 1회 보고

  return (
    <View style={{ width: viewW, height: viewH, backgroundColor: '#000' }}>
      <Image source={{ uri }} style={{ width: viewW, height: viewH }} resizeMode="contain" />
      <GestureDetector gesture={drag}>
        <Animated.View style={boxStyle} />
      </GestureDetector>
    </View>
  );
}

export default CropOverlay;
```

> 모서리 리사이즈 핸들·선택영역 밖 딤(4-패치)은 frontend-design 단계에서 마감. 최소 동작(이동+확정)은 위로 성립.

- [ ] **Step 2: TranslateCropScreen 구현**

`apps/mobile/src/screens/main/TranslateCropScreen.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { AppHeader, Button } from '../../components';
import CropOverlay from './components/CropOverlay';
import { cropToRect, toPixelRect, type Rect } from '../../lib/translate/cropImage';
import type { MainStackScreenProps } from '../../navigation/types';

export default function TranslateCropScreen({
  route, navigation,
}: MainStackScreenProps<'TranslateCrop'>): React.JSX.Element {
  const { image } = route.params;
  const { width } = useWindowDimensions();
  const viewH = Math.round(width * 1.1);
  const rectRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const pixel = toPixelRect(rectRef.current, { width, height: viewH }, image);
      const cropped = await cropToRect(image.uri, pixel);
      navigation.replace('TranslateResult', { uri: cropped });
    } finally { setBusy(false); }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="번역할 부분 선택" showBack />
      <CropOverlay uri={image.uri} viewW={width} viewH={viewH} onRectChange={r => (rectRef.current = r)} />
      <View className="px-xl" style={{ paddingTop: 16 }}>
        <Button title="이 부분 번역" onPress={confirm} loading={busy} />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: 라우트 등록**

`src/navigation/types.ts` `MainStackParamList`에 `JapaneseTranslate` 아래 추가:

```ts
  /** 번역할 사진의 범위 선택(크롭). */
  TranslateCrop: { image: { uri: string; width: number; height: number } };
  /** 번역 결과(원문+한국어). */
  TranslateResult: { uri: string };
```

`src/navigation/MainStack.tsx` — import 추가 후 `JapaneseTranslate` 스크린 아래:

```tsx
      <Stack.Screen name="TranslateCrop" component={TranslateCropScreen} />
      <Stack.Screen name="TranslateResult" component={TranslateResultScreen} />
```

(TranslateResultScreen은 Task 8에서 생성 — 미생성 구간은 해당 줄 임시 주석 후 Task 8에서 해제.)

- [ ] **Step 4: 타입 확인** — Run: `npx tsc --noEmit`(TranslateResult 미생성 시 그 줄 임시 주석) → 0.
- [ ] **Step 5: (사용자) 실기기 검증** — 갤러리→크롭 진입→사각형 이동→"이 부분 번역"→결과 이동.

---

## Task 8: 결과 화면 (frontend-design)

`uri`를 받아 이미지 업로드→{original,korean} 표시. 원문(편집)+번역, 원문 수정 후 "다시 번역"(텍스트 재번역), "다시 촬영"/"완료". 로딩·에러 상태.

**Files:**
- Create: `apps/mobile/src/screens/main/TranslateResultScreen.tsx`
- Modify: `apps/mobile/src/navigation/MainStack.tsx`(Task 7에서 등록했으면 확인만)

**Interfaces:**
- Consumes: `translateImage`/`translateText`(Task 6), `classifyTranslateError`/`errorMessage`(Task 6).

- [ ] **Step 1: 구현**

`apps/mobile/src/screens/main/TranslateResultScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

import { AppHeader, AppText, Button } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { translateImage, translateText } from '../../api/translate';
import { classifyTranslateError, errorMessage, type TransErrorKind } from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

type Status = 'uploading' | 'translating' | 'done' | 'error';

export default function TranslateResultScreen({
  route, navigation,
}: MainStackScreenProps<'TranslateResult'>): React.JSX.Element {
  const c = useThemeColors();
  const { uri } = route.params;
  const [status, setStatus] = useState<Status>('uploading');
  const [source, setSource] = useState('');
  const [result, setResult] = useState('');
  const [errKind, setErrKind] = useState<TransErrorKind>('unknown');

  useEffect(() => {
    (async () => {
      try {
        const { original, korean } = await translateImage(uri);
        if (!original) { setErrKind('no-text'); setStatus('error'); return; }
        setSource(original);
        setResult(korean);
        setStatus('done');
      } catch (e) {
        setErrKind(classifyTranslateError(e));
        setStatus('error');
      }
    })();
  }, [uri]);

  const retranslate = useCallback(async () => {
    setStatus('translating');
    try {
      const { korean } = await translateText(source);
      setResult(korean);
      setStatus('done');
    } catch (e) {
      setErrKind(classifyTranslateError(e));
      setStatus('error');
    }
  }, [source]);

  const busy = status === 'uploading' || status === 'translating';

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="번역 결과" showBack />
      <ScrollView contentContainerClassName="px-xl py-lg" style={{ gap: 16 }}>
        {status === 'error' ? (
          <View style={{ gap: 12, paddingVertical: 24 }}>
            <AppText variant="title" className="text-text-primary">{errorMessage(errKind).title}</AppText>
            <AppText variant="body" className="text-text-secondary">{errorMessage(errKind).message}</AppText>
            <Button title="다시 촬영" onPress={() => navigation.goBack()} />
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: c['bg-primary'], borderRadius: radius.lg, padding: 16, gap: 8 }}>
              <AppText variant="label" className="text-text-tertiary">원문 (일본어)</AppText>
              <TextInput value={source} onChangeText={setSource} multiline editable={!busy}
                style={{ color: c['text-primary'], fontSize: 18, lineHeight: 26, padding: 0 }} />
              <Button title="다시 번역" variant="soft" size="sm" onPress={retranslate} disabled={busy} />
            </View>
            <View style={{ backgroundColor: c['bg-primary'], borderRadius: radius.lg, padding: 16, gap: 8, minHeight: 120 }}>
              <AppText variant="label" className="text-text-tertiary">번역 (한국어)</AppText>
              {busy ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={c.brand} />
                  <AppText variant="caption" className="text-text-tertiary" style={{ marginTop: 8 }}>
                    {status === 'uploading' ? '읽는 중…' : '번역하는 중…'}
                  </AppText>
                </View>
              ) : (
                <AppText variant="body" className="text-text-primary" style={{ fontSize: 17, lineHeight: 25 }}>
                  {result}
                </AppText>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: 라우트 등록 확인** — `MainStack.tsx`에 import + `<Stack.Screen name="TranslateResult" .../>` 확인/해제.
- [ ] **Step 3: 타입·린트** — Run: `npx tsc --noEmit` → 0. `npx eslint src/screens/main/TranslateResultScreen.tsx` → 0 errors.
- [ ] **Step 4: (사용자) 실기기 검증** — 원문·번역 표시, 원문 수정→"다시 번역" 갱신, 글자 없는 사진→에러.

---

## Task 9: 진입 화면 연결 (frontend-design)

**Files:**
- Modify: `apps/mobile/src/screens/main/JapaneseTranslateScreen.tsx`

**Interfaces:**
- Consumes: `pickFromCamera`/`pickFromGallery`(Task 4), `classifyTranslateError`/`errorMessage`(Task 6), `useToast`.

- [ ] **Step 1: 구현**

`apps/mobile/src/screens/main/JapaneseTranslateScreen.tsx` 교체:

```tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppHeader, AppText, Button, Icon, useToast } from '../../components';
import { useThemeColors } from '../../theme/ThemeProvider';
import { pickFromCamera, pickFromGallery } from '../../lib/translate/imageSource';
import { classifyTranslateError, errorMessage } from '../../lib/translate/errors';
import type { MainStackScreenProps } from '../../navigation/types';

export default function JapaneseTranslateScreen(): React.JSX.Element {
  const c = useThemeColors();
  const navigation = useNavigation<MainStackScreenProps<'JapaneseTranslate'>['navigation']>();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onCamera() {
    setBusy(true);
    try {
      const img = await pickFromCamera();
      if (img) { navigation.navigate('TranslateResult', { uri: img.uri }); }
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
    } finally { setBusy(false); }
  }

  async function onGallery() {
    setBusy(true);
    try {
      const img = await pickFromGallery();
      if (img) { navigation.navigate('TranslateCrop', { image: img }); }
    } catch (e) {
      showToast(errorMessage(classifyTranslateError(e)).message, 'error');
    } finally { setBusy(false); }
  }

  return (
    <View className="flex-1 bg-bg-secondary">
      <AppHeader title="일본어 번역" showBack />
      <View className="flex-1 items-center justify-center px-xl" style={{ gap: 18 }}>
        <View className="items-center justify-center rounded-full"
          style={{ width: 88, height: 88, backgroundColor: c['brand-subtle'] }}>
          <Icon name="camera" size={40} color={c.brand} />
        </View>
        <View className="items-center" style={{ gap: 8 }}>
          <AppText variant="title" className="text-text-primary">카메라로 번역하기</AppText>
          <AppText variant="body" className="text-center text-text-tertiary">
            일본어가 적힌 간판·메뉴·책을 촬영하거나{'\n'}사진에서 번역할 부분을 골라 보세요.
          </AppText>
        </View>
        <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
          <Button title="카메라로 촬영" leftIcon="camera" onPress={onCamera} loading={busy} />
          <Button title="사진에서 선택" variant="soft" onPress={onGallery} disabled={busy} />
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 타입·린트** — Run: `npx tsc --noEmit` → 0. `npx eslint src/screens/main/JapaneseTranslateScreen.tsx` → 0.
- [ ] **Step 3: (사용자) 실기기 검증** — 홈→일본어 번역→촬영/사진 두 경로.

---

## Task 10: 전체 검증 + 문서 갱신

- [ ] **Step 1: 모바일 자동 검사** — `cd apps/mobile && npx jest && npx tsc --noEmit && npx eslint .` → jest 그린, tsc 0, eslint 0 errors.
- [ ] **Step 2: 백엔드 테스트** — `cd apps/server && source .venv/bin/activate && python manage.py test translate` → 그린.
- [ ] **Step 3: (사용자) end-to-end 실기기** — 키(.env GOOGLE_API_KEY) 설정 + 서버(8002)+`adb reverse` 후: 카메라·갤러리(크롭) 양 경로, 원문 편집 재번역, 글자 없는 사진 에러, 권한 거부 토스트.
- [ ] **Step 4: 문서 갱신** — `docs/프로잭트-현황.md`에 "일본어 번역(서버 Gemini OCR+번역, 카메라·사진범위선택)" 반영.

---

## Self-Review 메모

- **스펙 커버리지**: 카메라(4,9)·사진+범위선택(4,5,7)·서버 AI OCR+번역(1)·결과 원문+번역·재번역(8)·에러(1,6,8,9)·권한(2,3)·문서(10) 대응. 발음 미표시 = 결과 필드 없음.
- **타입 일관성**: `Rect`(cropImage.ts 단일), `PickedImage`(imageSource.ts 단일), `TransErrorKind`(errors.ts 단일), `TranslateImageResult`(api/translate.ts). 백엔드 응답 `{original, korean}`/`{korean}` 일관.
- **자동 테스트 한계**: 순수 로직만(toPixelRect·clampRect·firstAsset/buildPickerOptions·classifyTranslateError·백엔드 parse_translation_json·뷰 계약 mock). 카메라·크롭·화면·실기기·실제 AI 호출은 사용자 수동.
- **키 의존성**: `GOOGLE_API_KEY` 없으면 백엔드가 502(mock 테스트는 통과). 사용자가 `.env`에 채워야 실동작.
- **확인 포인트**: (1) `apiClient` export 형태(default/named), (2) accounts User 생성 필드(Task 8 테스트), (3) `@react-native-community/image-editor` cropImage 반환형(문자열 vs {uri}) — 코드에 양쪽 처리 포함.
