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
            'study_mode', 'study_level', 'study_kana_hiragana', 'study_kana_katakana',
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
    """온보딩/프로필 수정 — 닉네임/푸시 설정/학습 트랙(단일)."""

    class Meta:
        model = User
        fields = (
            'nickname', 'selected_jlpt_level', 'jlpt_level_word', 'jlpt_level_kanji',
            'push_enabled', 'push_quiz_reminder', 'push_marketing',
            'study_mode', 'study_level', 'study_kana_hiragana', 'study_kana_katakana',
        )

    def validate(self, attrs):
        # study_mode 가 들어오면 트랙별 정합성 검증.
        mode = attrs.get('study_mode', getattr(self.instance, 'study_mode', None))
        if 'study_mode' in attrs:
            leveled = (User.StudyMode.KANJI, User.StudyMode.KANJI_WORD, User.StudyMode.KANA_WORD)
            if mode in leveled:
                level = attrs.get('study_level', getattr(self.instance, 'study_level', None))
                if not level:
                    raise serializers.ValidationError('급수 모드는 study_level 이 필요합니다.')
            elif mode == User.StudyMode.KANA:
                hira = attrs.get('study_kana_hiragana', getattr(self.instance, 'study_kana_hiragana', False))
                kata = attrs.get('study_kana_katakana', getattr(self.instance, 'study_kana_katakana', False))
                if not (hira or kata):
                    raise serializers.ValidationError('가나 모드는 히라가나/가타카나 중 하나 이상이 필요합니다.')
            elif mode is None:
                # 트랙 초기화 시 연관 필드도 함께 비운다.
                attrs.setdefault('study_level', None)
                attrs.setdefault('study_kana_hiragana', False)
                attrs.setdefault('study_kana_katakana', False)
        return attrs


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
