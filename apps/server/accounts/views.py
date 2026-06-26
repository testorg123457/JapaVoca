"""accounts 뷰 — 게스트/구글/카카오 로그인(JWT 발급) / 계정 연결 / 내 프로필."""
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    ConsentSubmitSerializer,
    GoogleLoginSerializer,
    GuestLoginSerializer,
    KakaoLoginSerializer,
    LinkAccountSerializer,
    ProfileUpdateSerializer,
    UserSerializer,
)
from .services import (
    AccountLinkError,
    ConsentError,
    GoogleAuthError,
    GuestAuthError,
    KakaoAuthError,
    get_consent_status,
    login_as_guest,
    login_with_google,
    login_with_kakao,
    record_consent,
    upgrade_guest_with_google,
    upgrade_guest_with_kakao,
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


class GuestLoginView(APIView):
    """POST /api/auth/guest/ — 게스트 로그인. 기기별 guest_uid 로 게스트 유저 발급.

    소셜 키 없이도 즉시 시작 가능. 게스트는 학습·적립은 되지만 기프티콘 교환은 막혀 있고
    (어뷰징 방지), 설정에서 구글/카카오로 연결하면 같은 계정이 실계정으로 승격된다.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = GuestLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, created = login_as_guest(serializer.validated_data['guest_uid'])
        except GuestAuthError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(
            {
                'tokens': _issue_tokens(user),
                'user': UserSerializer(user).data,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )


class LinkAccountView(APIView):
    """POST /api/auth/link/ — 현재(게스트) 계정에 구글/카카오 연결.

    반드시 현재 게스트 JWT 로 인증된 요청이어야 한다(새 로그인이 아니라 '승격').
    충돌(이미 그 소셜 계정 존재) 시 기존 계정으로 로그인하고 게스트 진행분은 폐기한다
    (switched=True). 충돌 없으면 같은 행을 승격해 진행상황을 보존한다(switched=False).
    어느 경우든 응답의 새 토큰으로 교체해야 한다.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LinkAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data['provider']
        token = serializer.validated_data['token']
        try:
            if provider == 'google':
                user, switched = upgrade_guest_with_google(request.user, token)
            else:
                user, switched = upgrade_guest_with_kakao(request.user, token)
        except (GoogleAuthError, KakaoAuthError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
        except AccountLinkError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                'tokens': _issue_tokens(user),
                'user': UserSerializer(user).data,
                'switched': switched,
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

    def delete(self, request):
        """DELETE /api/auth/me/ — 회원 탈퇴(soft delete).

        하드 삭제하지 않는다:
          - 식별자(google_uid/kakao_uid/guest_uid)는 **재가입 차단용 묘비**로 남긴다
            (어뷰징 방지 — 같은 소셜계정 즉시 재가입으로 일일상한/가입보너스 리셋 차단).
          - 캐시 원장(append-only 자산기록)을 보존한다(정산/감사).
          - PII(email/nickname)는 즉시 익명화. 보존기간 경과분은 후속 배치로 완전삭제.
        status=WITHDRAWN + is_active=False 로 로그인이 차단된다(서비스 login 단계에서 reject).
        멱등: 이미 WITHDRAWN 이어도 204.
        """
        user = request.user
        with transaction.atomic():
            user.status = User.Status.WITHDRAWN
            user.is_active = False
            user.withdrawn_at = timezone.now()
            user.email = None
            user.nickname = '탈퇴회원'
            user.save(
                update_fields=['status', 'is_active', 'withdrawn_at', 'email', 'nickname'],
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConsentStatusView(APIView):
    """GET /api/auth/consent/status/ — 현재 약관 버전 + 재동의 필요 여부."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_consent_status(request.user))


class ConsentView(APIView):
    """POST /api/auth/consent/ — 동의 기록(append-only).

    append-only라 같은 버전을 다시 제출하면 행이 새로 추가된다(중복 자체는 무해 —
    get_consent_status가 항상 최신 행 기준으로 판정). 진짜 멱등(버전당 1행)이 필요하면
    record_consent를 (user, terms_version, privacy_version) get_or_create로 바꿔야 한다.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ConsentSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            record_consent(request.user, **serializer.validated_data)
        except ConsentError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(get_consent_status(request.user), status=status.HTTP_201_CREATED)
