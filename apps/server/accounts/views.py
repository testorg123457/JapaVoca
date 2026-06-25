"""accounts 뷰 — 구글 로그인(JWT 발급) / 내 프로필."""
from django.conf import settings
from django.http import Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    GoogleLoginSerializer,
    KakaoLoginSerializer,
    ProfileUpdateSerializer,
    UserSerializer,
)
from .services import (
    GoogleAuthError,
    KakaoAuthError,
    login_with_google,
    login_with_kakao,
)


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class GoogleLoginView(APIView):
    """POST /api/auth/google/ — 구글 ID 토큰으로 로그인, JWT 발급."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, created = login_with_google(serializer.validated_data['id_token'])
        except GoogleAuthError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(
            {
                'tokens': _issue_tokens(user),
                'user': UserSerializer(user).data,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )


class KakaoLoginView(APIView):
    """POST /api/auth/kakao/ — 카카오 access token 으로 로그인, JWT 발급."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = KakaoLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, created = login_with_kakao(serializer.validated_data['access_token'])
        except KakaoAuthError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(
            {
                'tokens': _issue_tokens(user),
                'user': UserSerializer(user).data,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )


class DevLoginView(APIView):
    """POST /api/auth/dev-login/ — DEBUG 전용. 구글 OAuth 없이 고정 테스트 유저로 JWT 발급.

    실 서비스(DEBUG=False)에선 URL 자체가 등록되지 않지만, 안전을 위해 뷰에서도
    한 번 더 막는다. 캐시 정합성/어뷰징과 무관한 '로그인 우회'일 뿐, 정답 판정·캐시
    지급은 여전히 서버에서 검증된다.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not settings.DEBUG:
            raise Http404
        user, created = User.objects.get_or_create(
            google_uid='dev-test-user',
            defaults={'email': 'dev@japavoca.test', 'nickname': '개발테스터'},
        )
        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])
        return Response(
            {
                'tokens': _issue_tokens(user),
                'user': UserSerializer(user).data,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """GET/PATCH /api/auth/me/ — 내 프로필 조회/수정."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)
