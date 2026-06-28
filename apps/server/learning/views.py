"""learning 뷰 — 퀴즈 출제 / 채점 / 북마크."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AnswerSerializer, BookmarkSerializer, SyncItemSerializer
from .services import (
    InvalidQuestionToken,
    NoContent,
    build_question,
    build_quiz_set,
    get_bookmark_ids,
    get_bookmarks_with_detail,
    grade_answer,
    sync_answers,
    toggle_bookmark,
)


class NextQuestionView(APIView):
    """GET /api/quiz/next/ — 단발 문제 1개 (잠금화면 등 세트 외 경로용)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            question = build_question(request.user)
        except NoContent as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(question)


class AnswerView(APIView):
    """POST /api/quiz/answer/ — 답안 제출(서버 채점, SRS 갱신, 세트/상자 반영)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = grade_answer(
                request.user,
                serializer.validated_data['question_token'],
                serializer.validated_data['choice_index'],
                serializer.validated_data.get('answer_ms'),
            )
        except InvalidQuestionToken as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class QuizSetView(APIView):
    """GET /api/quiz/set/ — 현재 활성 세트 반환 or 신규 생성."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = build_quiz_set(request.user)
        except NoContent as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(result)


class SyncAnswersView(APIView):
    """POST /api/quiz/sync/ — 오프라인 답안 동기화 (SRS/통계만, 상자 미지급)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SyncItemSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        results = sync_answers(request.user, serializer.validated_data)
        return Response(results)


class BookmarkView(APIView):
    """GET/POST/DELETE /api/quiz/bookmarks/ — 북마크 목록 조회 / 추가 / 해제."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_bookmarks_with_detail(request.user)
        return Response(data)

    def post(self, request):
        serializer = BookmarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = toggle_bookmark(
            request.user,
            serializer.validated_data['item_type'],
            serializer.validated_data['item_id'],
        )
        return Response({'is_bookmarked': created})

    def delete(self, request):
        serializer = BookmarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        toggle_bookmark(
            request.user,
            serializer.validated_data['item_type'],
            serializer.validated_data['item_id'],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
