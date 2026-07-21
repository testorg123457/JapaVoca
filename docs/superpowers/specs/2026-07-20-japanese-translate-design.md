# 일본어 번역 기능 설계 (서버 + AI 방식, B안)

작성일: 2026-07-20 (2026-07-21 B안으로 전환)
상태: 설계 확정 — 구현 진행

> **전환 이력**: 최초 "온디바이스 무료 ML Kit"(A안)로 설계했으나, RN 0.86 New Architecture에서
> 온디바이스 번역 라이브러리(`@react-native-ml-kit/translate-text`)가 alpha·미검증이라 빌드 리스크가
> 컸다. 사이드 프로젝트 **Kanjify**가 이미 "서버 + Gemini(AI 비전) OCR" 방식으로 동작 중임을 확인,
> 검증된 그 방식(B안)으로 전환한다. Kanjify 백엔드(`ai_utils.py`의 `call_gemini`/`call_openrouter`,
> `ocr_view`)를 JapaVoca Django로 이식한다.

## 1. 목적 / 한 줄 요약

일본어(단어·한자·문장)를 **카메라로 촬영하거나 사진의 범위를 골라** 서버로 올리면,
백엔드가 **Gemini(AI 비전)로 OCR + 번역**해 원문과 한국어 뜻을 돌려주는 기능.

## 2. 확정된 요구사항

- 입력 방식 (둘 다 v1)
  - ① 카메라 촬영 — 촬영 후 결과
  - ② 사진 업로드 + **커스텀 크롭 오버레이**로 범위 선택 후 그 부분만 업로드
- 처리: **서버 + AI**. 폰은 이미지 확보·크롭·업로드·표시만. OCR·번역은 백엔드 Gemini.
- 결과 페이지: **원문(수정 가능) + 한국어 번역**. 원문 수정 시 텍스트만 재번역.
- **발음/후리가나 표시 안 함**.
- 대상: 단어·한자 하나도, 문장·구절도.

## 3. 아키텍처 / 데이터 흐름

```
[모바일]
 진입화면 ─ 카메라 촬영 ─────────────────────────┐
          └ 사진 선택 → 커스텀 크롭(범위 선택) → crop ─┤
                                                    ▼ (이미지 파일)
                                    multipart 업로드 (JWT)
                                                    ▼
[백엔드 Django] POST /api/translate/image/
   → Gemini(google-generativeai)로 OCR+번역 (JSON: { original, korean })
   → 실패 시 OpenRouter 폴백
                                                    ▼
                                    { original, korean } 응답
                                                    ▼
[모바일] 결과화면: 원문(편집) + 한국어. 원문 수정 시 POST /api/translate/text/ 재번역.
```

- 업로드는 **multipart FormData(이미지 파일)** — base64 변환 없이 crop된 파일 uri를 그대로 전송.
- 인증: 기존 `apiClient`(JWT 자동 주입). 엔드포인트는 `IsAuthenticated`.

## 4. 기술 스택

### 모바일 (신규 의존성 — 모두 안정판, New Arch 지원)
| 역할 | 라이브러리 |
|---|---|
| 카메라 촬영 + 갤러리 선택 | `react-native-image-picker` (8.x) |
| 범위 선택 crop | 커스텀 오버레이(`gesture-handler`+`reanimated` 보유) + `@react-native-community/image-editor` (4.x) 좌표 crop |
| 업로드 | 기존 `apiClient`(axios) FormData |

> ML Kit·온디바이스 번역 **불필요**. A안의 alpha 라이브러리·New Arch 리스크가 사라진다.

### 백엔드 (JapaVoca Django, 신규)
| 역할 | 방법 |
|---|---|
| AI OCR+번역 | `google-generativeai` (Gemini flash), Kanjify `call_gemini` 이식 |
| 폴백 | OpenRouter (`requests`, 이미 있음), Kanjify `call_openrouter` 이식 |
| 엔드포인트 | 신규 앱 `translate`: `POST /api/translate/image/`, `POST /api/translate/text/` |

- 신규 env: `GOOGLE_API_KEY`(필수), `OPEN_ROUTER_KEY`(선택, 폴백). `.env.example`에 자리 추가.
  **키는 사용자가 채운다**(Kanjify와 동일 키 재사용 가능).
- 신규 requirement: `google-generativeai`.

## 5. 백엔드 프롬프트 (한 번의 호출로 OCR+번역)

Gemini에 이미지+프롬프트를 보내 **JSON**으로 받는다:

```
이 이미지에서 일본어(한자·가나) 텍스트를 읽고 한국어로 번역하라.
반드시 아래 JSON으로만 응답하라. 설명 금지.
{ "original": "이미지의 일본어 원문", "korean": "한국어 번역" }
글자가 없으면 original을 빈 문자열로 두라.
```

텍스트 재번역(`/text/`)은 이미지 없이 `{ text }`를 받아 `{ "korean": "..." }` 반환.

## 6. 화면 흐름 / 모듈

- `JapaneseTranslateScreen`(수정) — 진입. 촬영/사진 버튼.
- `TranslateCropScreen`(신규) — 커스텀 크롭 오버레이.
- `TranslateResultScreen`(신규) — 원문(편집)+번역, 재번역, 다시촬영/완료. 업로드·로딩·에러 상태.
- `src/lib/translate/imageSource.ts` — 카메라/갤러리 확보(image-picker 래퍼).
- `src/lib/translate/cropImage.ts` — 오버레이 좌표→픽셀 변환(순수) + crop 실행.
- `src/lib/translate/cropGeometry.ts` — 드래그 사각형 클램프(순수).
- `src/api/translate.ts` — `translateImage(fileUri)`, `translateText(text)` (apiClient 사용).
- 백엔드 `translate/` 앱: `views.py`(image_view, text_view), `ai.py`(Kanjify 이식), `urls.py`.

## 7. 에러 처리 (앱 톤, 사과 없이 다음 행동 안내)

- 카메라/갤러리 권한 거부 → 안내(토스트)
- 글자 인식 실패(original 빈값) → "글자를 찾지 못했어요. 더 또렷하게 다시 찍어 주세요."
- AI/네트워크 실패(서버 5xx, 타임아웃) → 재시도 안내. (기존 네트워크 토스트 재사용 가능)
- 서버에 키 미설정 → 500 + 로그(개발용); 앱엔 일반 실패 문구.

## 8. 어뷰징/비용 (캐시 앱 특성)

- 엔드포인트 `IsAuthenticated` 필수. (MVP)
- 추후: 사용자별 일일 호출 상한(daily 테이블 패턴 참고), Gemini flash로 단가 최소화.

## 9. 범위 / 비범위

- v1: 카메라·사진범위선택·서버 AI OCR+번역·결과 원문편집/재번역·에러 처리.
- 비범위(추후): 발음/후리가나, 실시간 오버레이, 한자 상세 분석(Kanjify analyze_kanji), 일일 상한, 결과 저장/단어장.

## 10. 미해결/확인 필요

- **AI 키**: `GOOGLE_API_KEY`(필수), `OPEN_ROUTER_KEY`(선택) — 사용자가 `.env`에 채워야 실동작.
- 백엔드 포트 이슈(개발 8002, `adb reverse tcp:8001 tcp:8002`)는 기존과 동일.
