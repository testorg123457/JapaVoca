"""accounts 시리얼라이저."""
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """유저 프로필 응답용."""

    is_guest = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'provider', 'google_uid', 'email', 'nickname', 'is_guest',
            'selected_jlpt_level', 'jlpt_level_word', 'jlpt_level_kanji',
            'push_enabled', 'push_quiz_reminder', 'push_marketing',
            'status', 'created_at',
        )
        read_only_fields = fields


class GoogleLoginSerializer(serializers.Serializer):
    """구글 로그인 요청 — RN 이 받은 구글 ID 토큰."""

    id_token = serializers.CharField()


class KakaoLoginSerializer(serializers.Serializer):
    """카카오 로그인 요청 — RN 카카오 SDK 가 받은 access token."""

    access_token = serializers.CharField()


class GuestLoginSerializer(serializers.Serializer):
    """게스트 로그인 요청 — 클라가 생성한 기기 식별자(UUID)."""

    guest_uid = serializers.CharField(max_length=64)


class LinkAccountSerializer(serializers.Serializer):
    """게스트 → 소셜 계정 연결 요청 — provider + 해당 토큰(구글 id_token / 카카오 access token)."""

    provider = serializers.ChoiceField(choices=['google', 'kakao'])
    token = serializers.CharField()


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """온보딩/프로필 수정 — 닉네임/학습 급수(단어·한자 별도)/푸시 설정."""

    class Meta:
        model = User
        fields = (
            'nickname', 'selected_jlpt_level', 'jlpt_level_word', 'jlpt_level_kanji',
            'push_enabled', 'push_quiz_reminder', 'push_marketing',
        )


class ConsentSubmitSerializer(serializers.Serializer):
    """동의 제출 — 필수(이용약관·개인정보)는 제출 자체가 동의이므로 별도 필드 없음.

    phone_data_agreed: 휴대폰번호 데이터 동의(게스트는 서버가 무시).
    marketing_agreed: 선택. phone_number: 선택(미획득 시 생략/공백 → null).
    """

    marketing_agreed = serializers.BooleanField(default=False)
    phone_data_agreed = serializers.BooleanField(default=False)
    phone_number = serializers.CharField(
        max_length=20, required=False, allow_null=True, allow_blank=True,
    )

    def validate(self, attrs):
        if not attrs.get('phone_number'):
            attrs['phone_number'] = None
        return attrs
