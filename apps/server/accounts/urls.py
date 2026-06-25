"""accounts URL — /api/auth/ 하위."""
from django.conf import settings
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import DevLoginView, GoogleLoginView, KakaoLoginView, MeView

app_name = 'accounts'

urlpatterns = [
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('kakao/', KakaoLoginView.as_view(), name='kakao-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', MeView.as_view(), name='me'),
]

# DEBUG 전용 dev 로그인 — 실 서비스에선 URL 자체를 등록하지 않는다.
if settings.DEBUG:
    urlpatterns += [path('dev-login/', DevLoginView.as_view(), name='dev-login')]
