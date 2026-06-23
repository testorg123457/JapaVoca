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

    google_uid = models.CharField(max_length=150, unique=True, help_text='구글 OAuth 식별자')
    email = models.EmailField(unique=True)
    nickname = models.CharField(max_length=50, blank=True)
    # 학습 급수: 온보딩에서 선택하므로 가입 직후엔 비어 있을 수 있어 null 허용.
    selected_jlpt_level = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
        help_text='학습 급수(N1~N5)',
    )
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
        db_table = 'accounts_user'
        verbose_name = '유저'
        verbose_name_plural = '유저'

    def __str__(self):
        return f'{self.nickname or self.email} ({self.google_uid})'
