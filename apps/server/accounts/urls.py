"""accounts URL — /api/auth/ 하위."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ConsentStatusView,
    ConsentView,
    GoogleLoginView,
    GuestLoginView,
    KakaoLoginView,
    LinkAccountView,
    MeView,
)

app_name = 'accounts'

urlpatterns = [
    path('guest/', GuestLoginView.as_view(), name='guest-login'),
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('kakao/', KakaoLoginView.as_view(), name='kakao-login'),
    path('link/', LinkAccountView.as_view(), name='link-account'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('consent/status/', ConsentStatusView.as_view(), name='consent-status'),
    path('consent/', ConsentView.as_view(), name='consent'),
]
