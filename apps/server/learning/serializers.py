"""learning 시리얼라이저."""
from rest_framework import serializers


class AnswerSerializer(serializers.Serializer):
    question_token = serializers.CharField()
    choice_index = serializers.IntegerField(min_value=0, max_value=3)
    answer_ms = serializers.IntegerField(min_value=0, required=False, allow_null=True)


class SyncItemSerializer(serializers.Serializer):
    question_token = serializers.CharField()
    choice_index = serializers.IntegerField(min_value=0, max_value=3)
    answer_ms = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    answered_at = serializers.CharField(required=False, allow_blank=True)


class BookmarkSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=['word', 'kanji', 'kana'])
    item_id = serializers.IntegerField(min_value=1)
