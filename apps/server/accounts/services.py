"""accounts 서비스 — 소셜 로그인(구글/카카오) 검증 / 유저 로그인 처리."""
import requests
from django.conf import settings
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import User


class GoogleAuthError(Exception):
    """구글 ID 토큰 검증 실패."""


class KakaoAuthError(Exception):
    """카카오 access token 검증 실패."""


def verify_google_id_token(token: str) -> dict:
    """구글 ID 토큰을 검증하고 payload(dict)를 반환한다.

    GOOGLE_CLIENT_ID 가 설정돼 있으면 audience 로 검사한다(dev 에선 생략).
    실패 시 GoogleAuthError 를 던진다. (네트워크로 구글 공개키를 받아 서명 검증)
    """
    audience = settings.GOOGLE_CLIENT_ID or None
    try:
        payload = google_id_token.verify_oauth2_token(
            token, google_requests.Request(), audience,
        )
    except ValueError as exc:
        raise GoogleAuthError(str(exc)) from exc

    if payload.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        raise GoogleAuthError('유효하지 않은 토큰 발급자(iss).')
    if not payload.get('sub'):
        raise GoogleAuthError('토큰에 sub(google_uid)가 없습니다.')
    return payload


def login_with_google(token: str) -> tuple[User, bool]:
    """구글 ID 토큰으로 로그인. (user, created) 반환.

    sub→google_uid 로 유저를 get_or_create 하고 last_login_at 을 갱신한다.
    """
    payload = verify_google_id_token(token)
    google_uid = payload['sub']
    email = payload.get('email', '')
    name = payload.get('name', '')

    user, created = User.objects.get_or_create(
        google_uid=google_uid,
        defaults={'email': email, 'nickname': name},
    )
    if user.status == User.Status.BANNED:
        raise GoogleAuthError('차단된 계정입니다.')

    # 이메일이 비어있던 기존 유저면 보강.
    if email and not user.email:
        user.email = email
    user.last_login_at = timezone.now()
    user.save(update_fields=['email', 'last_login_at'])
    return user, created


def login_with_kakao(access_token: str) -> tuple[User, bool]:
    """카카오 access token 으로 로그인. (user, created) 반환.

    클라(카카오 SDK)가 받은 access token 으로 kapi.kakao.com 의 사용자 정보를 조회해
    검증한다(토큰이 유효해야 200). kakao_uid 로 유저를 get_or_create 한다.
    """
    try:
        resp = requests.get(
            f'{settings.KAKAO_API_BASE}/v2/user/me',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise KakaoAuthError(f'카카오 서버 통신 실패: {exc}') from exc
    if resp.status_code != 200:
        raise KakaoAuthError('유효하지 않은 카카오 토큰입니다.')

    data = resp.json()
    kakao_uid = str(data.get('id') or '')
    if not kakao_uid:
        raise KakaoAuthError('카카오 사용자 id 가 없습니다.')
    account = data.get('kakao_account') or {}
    profile = account.get('profile') or {}
    email = account.get('email') or ''
    nickname = profile.get('nickname') or ''

    # email 은 unique·not-null. 미동의/충돌 시 합성 이메일로 폴백.
    if not email or User.objects.filter(email=email).exclude(kakao_uid=kakao_uid).exists():
        email = f'kakao_{kakao_uid}@kakao.local'

    user, created = User.objects.get_or_create(
        kakao_uid=kakao_uid,
        defaults={'provider': User.Provider.KAKAO, 'email': email, 'nickname': nickname},
    )
    if user.status == User.Status.BANNED:
        raise KakaoAuthError('차단된 계정입니다.')

    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])
    return user, created
