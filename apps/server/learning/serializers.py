"""learning 시리얼라이저 — 퀴즈 답안 입력."""
from rest_framework import serializers


class AnswerSerializer(serializers.Serializer):
    question_token = serializers.CharField()
    choice_index = serializers.IntegerField(min_value=0, max_value=3)
    answer_ms = serializers.IntegerField(min_value=0, required=False, allow_null=True)
