"""accounts 시리얼라이저."""
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """유저 프로필 응답용."""

    class Meta:
        model = User
        fields = (
            'id', 'google_uid', 'email', 'nickname',
            'selected_jlpt_level', 'status', 'created_at',
        )
        read_only_fields = fields


class GoogleLoginSerializer(serializers.Serializer):
    """구글 로그인 요청 — RN 이 받은 구글 ID 토큰."""

    id_token = serializers.CharField()


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """온보딩/프로필 수정 — 닉네임/학습 급수."""

    class Meta:
        model = User
        fields = ('nickname', 'selected_jlpt_level')
