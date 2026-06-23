"""accounts 뷰 — 구글 로그인(JWT 발급) / 내 프로필."""
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import GoogleLoginSerializer, ProfileUpdateSerializer, UserSerializer
from .services import GoogleAuthError, login_with_google


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
