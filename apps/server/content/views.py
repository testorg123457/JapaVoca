"""content 뷰 — 한자 구성자 API."""
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Kanji
from .services import build_component_tree

# 한자 데이터는 변경이 없으므로 1주일 캐시
_WEEK = 60 * 60 * 24 * 7


@method_decorator(cache_page(_WEEK), name='dispatch')
class KanjiComponentView(APIView):
    """GET /api/content/kanji/<character>/components/ — 구성자 트리 조회."""

    permission_classes = [IsAuthenticated]

    def get(self, request, character):
        if not Kanji.objects.filter(character=character).exists():
            return Response(
                {'detail': '한자를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(build_component_tree(character))
