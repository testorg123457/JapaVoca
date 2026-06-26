"""accounts 앱 — 유저 도메인.

Google OAuth(google_uid) 기반 커스텀 유저. Django 기본 username 인증은 쓰지 않는다.
settings.py 에 AUTH_USER_MODEL = 'accounts.User' 등록 필수.
"""
from django.conf import settings
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
        # 회원 탈퇴(soft delete). 식별자(google/kakao/guest_uid)는 재가입 차단용 묘비로 남기고
        # PII(email/nickname)는 익명화한다. 보존기간 경과분은 배치로 완전 삭제(후속).
        WITHDRAWN = 'withdrawn', '탈퇴'

    class Provider(models.TextChoices):
        GUEST = 'guest', '게스트'
        GOOGLE = 'google', '구글'
        KAKAO = 'kakao', '카카오'

    class StudyMode(models.TextChoices):
        KANJI = 'kanji', '한자'
        KANJI_WORD = 'kanji_word', '한자단어'
        KANA_WORD = 'kana_word', '가나단어'
        KANA = 'kana', '가나'  # 출제는 후속 플랜(현재 미지원)

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

    # 단일 학습 트랙 선택(온보딩). study_mode 가 null 이면 온보딩(학습 선택) 미완료.
    study_mode = models.CharField(
        max_length=12, choices=StudyMode.choices, null=True, blank=True,
        help_text='현재 학습 트랙(단일). null=온보딩 미완료',
    )
    study_level = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
        help_text='study_mode 가 한자/한자단어/가나단어일 때의 급수',
    )
    study_kana_hiragana = models.BooleanField(default=False, help_text='가나 트랙: 히라가나 포함')
    study_kana_katakana = models.BooleanField(default=False, help_text='가나 트랙: 가타카나 포함')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # 탈퇴 시각(soft delete). 보존기간 경과분 완전삭제 배치의 기준.
    withdrawn_at = models.DateTimeField(null=True, blank=True, help_text='회원 탈퇴 시각(soft delete)')

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


class ConsentAgreement(models.Model):
    """약관/개인정보/휴대폰번호/마케팅 동의 이력 (append-only).

    원장(Ledger)과 같은 철학: 수정·삭제하지 않고 동의할 때마다 행을 추가한다.
    현재 약관 버전은 settings.TERMS_VERSION / PRIVACY_VERSION 으로 관리하며,
    버전이 올라가면 그 버전의 동의 행이 없는 유저는 재동의 대상이 된다.
    게스트는 휴대폰번호 데이터 동의/수집 대상이 아니다(서버에서 강제 false/null).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='consents',
    )
    terms_version = models.CharField(max_length=20, help_text='동의한 이용약관 버전')
    privacy_version = models.CharField(max_length=20, help_text='동의한 개인정보 처리방침 버전')
    phone_data_agreed = models.BooleanField(default=False, help_text='휴대폰번호 데이터 동의(게스트 False)')
    marketing_agreed = models.BooleanField(default=False, help_text='마케팅 정보 수신 동의(선택)')
    # PII — 최소 수집. 게스트/미획득 시 null.
    phone_number = models.CharField(max_length=20, null=True, blank=True, help_text='휴대폰 번호(PII, 게스트 null)')
    agreed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_accounts_consent'
        ordering = ['-agreed_at']
        verbose_name = '동의 이력'
        verbose_name_plural = '동의 이력'

    def save(self, *args, **kwargs):
        # append-only: 이미 존재하는 행(pk 보유)은 수정 금지. 동의는 행 추가로만 기록한다.
        if self.pk is not None:
            raise TypeError('ConsentAgreement is append-only and cannot be updated.')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user_id} terms@{self.terms_version} privacy@{self.privacy_version}'
