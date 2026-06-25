"""accounts 서비스 — 게스트/소셜 로그인(구글/카카오) 검증 / 유저 로그인·계정 연결 처리."""
import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import User

GUEST_NICKNAME = '게스트'


class GoogleAuthError(Exception):
    """구글 ID 토큰 검증 실패."""


class KakaoAuthError(Exception):
    """카카오 access token 검증 실패."""


class GuestAuthError(Exception):
    """게스트 로그인 실패."""


class AccountLinkError(Exception):
    """게스트 → 소셜 계정 연결 실패(이미 실계정이거나 지원하지 않는 연결)."""


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


def fetch_kakao_account(access_token: str) -> tuple[str, str, str]:
    """카카오 access token 검증 + 사용자 정보 조회. (kakao_uid, email, nickname) 반환.

    클라(카카오 SDK)가 받은 access token 으로 kapi.kakao.com 의 사용자 정보를 조회해
    검증한다(토큰이 유효해야 200).
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
    return kakao_uid, email, nickname


def login_with_kakao(access_token: str) -> tuple[User, bool]:
    """카카오 access token 으로 로그인. (user, created) 반환. kakao_uid 로 get_or_create."""
    kakao_uid, email, nickname = fetch_kakao_account(access_token)

    # email 은 unique. 미동의/충돌 시 합성 이메일로 폴백.
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


def login_as_guest(guest_uid: str) -> tuple[User, bool]:
    """게스트 로그인 — 기기별 guest_uid 로 게스트 유저를 get_or_create. (user, created) 반환.

    사람마다(기기마다) 독립 게스트 계정이 생성된다. 이메일/소셜 식별자 없이 guest_uid 로만 식별.
    나중에 upgrade_guest_with_* 로 같은 행에 소셜 식별자를 붙여 실계정으로 승격할 수 있다.
    """
    if not guest_uid:
        raise GuestAuthError('guest_uid 는 필수입니다.')
    user, created = User.objects.get_or_create(
        guest_uid=guest_uid,
        defaults={'provider': User.Provider.GUEST, 'nickname': GUEST_NICKNAME, 'email': None},
    )
    if user.status == User.Status.BANNED:
        raise GuestAuthError('차단된 계정입니다.')
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])
    return user, created


def _upgrade_or_switch(guest_user, *, provider_value, uid_field, uid_value, email, nickname):
    """게스트를 소셜 계정으로 연결하는 공통 로직.

    - 그 소셜 식별자로 이미 가입된 계정이 있으면 → 그 **기존 계정으로 로그인**(게스트 진행분 폐기),
      (user=기존계정, switched=True) 반환. [충돌 정책: 기존계정 사용]
    - 충돌이 없으면 → 현재 게스트 **같은 행을 그 자리에서 승격**(캐시·원장·스트릭 보존),
      (user=게스트, switched=False) 반환.
    - 현재 유저가 게스트가 아니면(이미 실계정) 식별자 덮어쓰기 위험이 있어 막는다.
    """
    existing = User.objects.filter(**{uid_field: uid_value}).first()
    if existing is not None:
        if existing.status == User.Status.BANNED:
            raise AccountLinkError('차단된 계정입니다.')
        existing.last_login_at = timezone.now()
        existing.save(update_fields=['last_login_at'])
        # 이미 본인 계정이면 전환 아님, 다른 기존 계정이면 전환(게스트 폐기).
        return existing, existing.pk != guest_user.pk

    if not guest_user.is_guest:
        raise AccountLinkError('이미 연결된 계정입니다.')

    setattr(guest_user, uid_field, uid_value)
    guest_user.provider = provider_value
    # 이메일은 비어있고 충돌 없을 때만 설정(unique 보호).
    if email and not User.objects.filter(email=email).exclude(pk=guest_user.pk).exists():
        guest_user.email = email
    # 닉네임이 비었거나 기본 '게스트'면 소셜 닉네임으로 교체.
    if nickname and (not guest_user.nickname or guest_user.nickname == GUEST_NICKNAME):
        guest_user.nickname = nickname
    guest_user.last_login_at = timezone.now()
    guest_user.save()
    return guest_user, False


@transaction.atomic
def upgrade_guest_with_google(guest_user, id_token: str) -> tuple[User, bool]:
    """게스트를 구글 계정으로 연결. (user, switched) 반환."""
    payload = verify_google_id_token(id_token)
    return _upgrade_or_switch(
        guest_user,
        provider_value=User.Provider.GOOGLE,
        uid_field='google_uid',
        uid_value=payload['sub'],
        email=payload.get('email') or '',
        nickname=payload.get('name') or '',
    )


@transaction.atomic
def upgrade_guest_with_kakao(guest_user, access_token: str) -> tuple[User, bool]:
    """게스트를 카카오 계정으로 연결. (user, switched) 반환."""
    kakao_uid, email, nickname = fetch_kakao_account(access_token)
    return _upgrade_or_switch(
        guest_user,
        provider_value=User.Provider.KAKAO,
        uid_field='kakao_uid',
        uid_value=kakao_uid,
        email=email,
        nickname=nickname,
    )
