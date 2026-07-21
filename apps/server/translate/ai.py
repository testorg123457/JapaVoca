"""일본어 이미지 OCR + 한국어 번역 — Gemini(google-generativeai).

Kanjify(backend/api/ai_utils.py)의 call_gemini를 이식·축약했다.
키는 env: GOOGLE_API_KEY(필수). 폴백 없음.

google.generativeai 는 _call_gemini 안에서 지연 import 한다 —
패키지 미설치 환경(테스트 등)에서도 모듈 로드가 깨지지 않게.
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
    m = re.search(r'\{.*\}', raw.strip(), re.DOTALL)
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
    """이미지 → {original, korean}."""
    return _run(_IMAGE_PROMPT, image_bytes)


def translate_text(text: str) -> str:
    """일본어 텍스트 → 한국어."""
    return _run(_text_prompt(text), None)['korean']
