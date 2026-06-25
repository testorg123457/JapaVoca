"""accounts 앱 — 유저 도메인.

Google OAuth(google_uid) 기반 커스텀 유저. Django 기본 username 인증은 쓰지 않는다.
settings.py 에 AUTH_USER_MODEL = 'accounts.User' 등록 필수.
"""
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    """google_uid 를 식별자로 쓰는 유저 매니저."""

    use_in_migrations = True

    def create_user(self, google_uid, email, password=None, **extra_fields):
        if not google_uid:
            raise ValueError('google_uid 는 필수입니다.')
        if not email:
            raise ValueError('email 은 필수입니다.')
        email = self.normalize_email(email)
        user = self.model(google_uid=google_uid, email=email, **extra_fields)
        # 소셜 로그인 유저는 비밀번호가 없을 수 있다(set_unusable_password).
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, google_uid, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('superuser 는 is_staff=True 여야 합니다.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('superuser 는 is_superuser=True 여야 합니다.')
        return self.create_user(google_uid, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """커스텀 유저. google_uid 기반 인증.

    is_active / is_staff 포함(is_superuser·groups·user_permissions 는 PermissionsMixin 제공).
    """

    class JLPTLevel(models.TextChoices):
        N1 = 'N1', 'N1'
        N2 = 'N2', 'N2'
        N3 = 'N3', 'N3'
        N4 = 'N4', 'N4'
        N5 = 'N5', 'N5'

    class Status(models.TextChoices):
        ACTIVE = 'active', '정상'
        FLAGGED = 'flagged', '의심(어뷰징)'
        BANNED = 'banned', '차단'

    class Provider(models.TextChoices):
        GUEST = 'guest', '게스트'
        GOOGLE = 'google', '구글'
        KAKAO = 'kakao', '카카오'

    # 소셜 식별자 — 멀티 프로바이더. 카카오 유저는 google_uid 가 없으므로 null 허용
    # (Postgres unique 는 NULL 다중 허용). 카카오는 kakao_uid 로 식별한다.
    # 게스트는 셋 다 비고 기기별 guest_uid 로만 식별 → 나중에 소셜 연결 시 같은 행을 승격.
    google_uid = models.CharField(
        max_length=150, unique=True, null=True, blank=True, help_text='구글 OAuth 식별자',
    )
    kakao_uid = models.CharField(
        max_length=150, unique=True, null=True, blank=True, help_text='카카오 식별자',
    )
    guest_uid = models.CharField(
        max_length=64, unique=True, null=True, blank=True,
        help_text='게스트 기기 식별자(클라가 생성한 UUID). 소셜 연결 후에도 보존(기기 연속성).',
    )
    provider = models.CharField(
        max_length=10, choices=Provider.choices, default=Provider.GOOGLE,
        help_text='가입/로그인 제공자',
    )
    # 게스트는 이메일이 없으므로 null 허용(Postgres unique 는 NULL 다중 허용).
    email = models.EmailField(unique=True, null=True, blank=True)
    nickname = models.CharField(max_length=50, blank=True)
    # 학습 급수: 온보딩에서 선택하므로 가입 직후엔 비어 있을 수 있어 null 허용.
    # selected_jlpt_level 은 하위호환(공통 기본). 출제는 단어/한자 별도 급수를 우선 사용한다.
    selected_jlpt_level = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
        help_text='(하위호환) 공통 학습 급수',
    )
    jlpt_level_word = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
        help_text='단어 학습 급수(N1~N5)',
    )
    jlpt_level_kanji = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
        help_text='한자 학습 급수(N1~N5)',
    )
    # 푸시 알림 환경설정.
    push_enabled = models.BooleanField(default=True, help_text='전체 푸시 수신')
    push_quiz_reminder = models.BooleanField(default=True, help_text='학습 리마인더 푸시')
    push_marketing = models.BooleanField(default=False, help_text='마케팅/이벤트 푸시(동의 기반)')
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'google_uid'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'tbl_accounts_user'
        verbose_name = '유저'
        verbose_name_plural = '유저'

    @property
    def is_guest(self) -> bool:
        """게스트 계정 여부. 소셜 식별자가 하나도 없으면 게스트로 본다."""
        return self.provider == self.Provider.GUEST or not (self.google_uid or self.kakao_uid)

    def __str__(self):
        return f'{self.nickname or self.email or self.guest_uid} ({self.provider})'
