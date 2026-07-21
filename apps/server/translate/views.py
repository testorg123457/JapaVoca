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
_MAX_TEXT_LEN = 2000  # 재번역 텍스트 길이 상한(유료 AI 남용 방지)


class TranslateImageView(APIView):
    """POST /api/translate/image/ (multipart image) → {original, korean}."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_scope = 'translate'

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
    """POST /api/translate/text/ ({text}) → {korean}. 원문 수정 후 재번역용."""

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    throttle_scope = 'translate'

    def post(self, request):
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'detail': '텍스트가 없습니다.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if len(text) > _MAX_TEXT_LEN:
            return Response({'detail': '텍스트가 너무 깁니다.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            korean = translate_text(text)
        except Exception as e:  # noqa: BLE001
            logger.error('translate text 실패: %s', e)
            return Response({'detail': '번역에 실패했습니다.'},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response({'korean': korean})
