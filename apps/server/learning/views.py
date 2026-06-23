"""learning 뷰 — 퀴즈 출제 / 채점."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ItemType
from .serializers import AnswerSerializer
from .services import InvalidQuestionToken, NoContent, build_question, grade_answer


class NextQuestionView(APIView):
    """GET /api/quiz/next/?mode=word|kanji — 다음 문제 1개."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        mode = request.query_params.get('mode', ItemType.WORD)
        if mode not in (ItemType.WORD, ItemType.KANJI):
            return Response({'detail': "mode 는 'word' 또는 'kanji'."}, status=400)
        try:
            question = build_question(request.user, mode)
        except NoContent as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(question)


class AnswerView(APIView):
    """POST /api/quiz/answer/ — 답안 제출(서버 채점, SRS 갱신, 정답 시 상자 생성)."""

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
