"""rewards 앱 — 캐시 / 리워드 도메인.

⚠️ 캐시 정합성 핵심 원칙 (CLAUDE.md):
  - 모든 캐시 변동은 **Wallet 잔액 갱신 + Ledger 기록을 하나의 트랜잭션**으로 처리한다.
  - wallet.balance == (ledger earn 합 − use 합) 이 항상 일치해야 한다.
  - 차감은 `balance >= amount` 조건부 UPDATE(행 잠금)로 음수/이중차감을 막는다.
  - 정답 판정·캐시 지급은 서버에서만 검증. 광고 보상은 AdMob SSV 통과 후에만 지급.
모든 금액 필드는 정수 캐시 단위(BigIntegerField), 소수점 없음.
"""
from django.conf import settings
from django.db import models


class Wallet(models.Model):
    """캐시 잔고 — 유저 1:1.

    balance 는 항상 0 이상. 변동은 Ledger 기록과 같은 트랜잭션에서만 갱신한다.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        primary_key=True, related_name='wallet',
    )
    balance = models.BigIntegerField(default=0, help_text='현재 캐시 (≥ 0)')
    total_earned = models.BigIntegerField(default=0, help_text='누적 적립 합(통계용)')
    total_used = models.BigIntegerField(default=0, help_text='누적 사용 합(통계용)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_rewards_wallet'
        verbose_name = '지갑'
        verbose_name_plural = '지갑'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(balance__gte=0), name='wallet_balance_gte_0',
            ),
        ]

    def __str__(self):
        return f'wallet(user={self.user_id}, balance={self.balance})'


class Ledger(models.Model):
    """캐시 거래 통합 원장 — append-only(불변).

    ⚠️ 절대 수정/삭제하지 않는다. amount 는 항상 양수(절대값)이고 부호는 direction 이 결정한다.
    유저 삭제로 원장이 사라지면 안 되므로 user FK 는 PROTECT.
    """

    class Direction(models.TextChoices):
        EARN = 'earn', '적립'
        USE = 'use', '사용'

    class Reason(models.TextChoices):
        # earn
        QUIZ_BOX = 'quiz_box', '퀴즈 상자'
        ATTENDANCE = 'attendance', '출석'
        STREAK = 'streak', '연속출석'
        AD_BONUS = 'ad_bonus', '광고 보너스'
        # use
        EXCHANGE = 'exchange', '기프티콘 교환'
        # both
        ADMIN_ADJUST = 'admin_adjust', '관리자 조정'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='ledgers',
    )
    direction = models.CharField(max_length=4, choices=Direction.choices)
    amount = models.BigIntegerField(help_text='항상 양수(절대값). 부호는 direction 이 결정')
    reason = models.CharField(max_length=20, choices=Reason.choices)
    ref_type = models.CharField(
        max_length=50, blank=True, help_text='관련 엔티티 종류(cash_box / gift_exchange / attendance …)',
    )
    ref_id = models.PositiveIntegerField(null=True, blank=True, help_text='관련 엔티티 id')
    balance_after = models.BigIntegerField(help_text='거래 직후 잔액 스냅샷(감사용)')
    ad_verified = models.BooleanField(default=False, help_text='광고 SSV 검증 여부')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_rewards_ledger'
        verbose_name = '원장'
        verbose_name_plural = '원장'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_ledger_user_created'),
            models.Index(
                fields=['user', 'direction', 'created_at'],
                name='idx_ledger_user_dir_created',
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name='ledger_amount_positive',
            ),
        ]

    def __str__(self):
        sign = '+' if self.direction == self.Direction.EARN else '-'
        return f'{self.user_id} {sign}{self.amount} ({self.reason})'


class CashBox(models.Model):
    """캐시상자 인벤토리. 개봉 시 reward_cash 확정."""

    class Grade(models.TextChoices):
        NORMAL = 'normal', '일반'
        PURPLE = 'purple', '보라'

    class Status(models.TextChoices):
        UNOPENED = 'unopened', '미개봉'
        OPENED = 'opened', '개봉'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cash_boxes',
    )
    grade = models.CharField(max_length=10, choices=Grade.choices)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.UNOPENED,
    )
    reward_cash = models.PositiveIntegerField(
        null=True, blank=True, help_text='개봉 시 확정 캐시(개봉 전 null)',
    )
    opened_via_ad = models.BooleanField(default=False, help_text='광고 보고 개봉한 상자인지')
    created_at = models.DateTimeField(auto_now_add=True)
    opened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_rewards_cashbox'
        verbose_name = '캐시상자'
        verbose_name_plural = '캐시상자'
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_cashbox_user_status'),
        ]

    def __str__(self):
        return f'box(user={self.user_id}, {self.grade}, {self.status})'


class Attendance(models.Model):
    """출석 / 연속출석. 하루 1건."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendances',
    )
    date = models.DateField(help_text='출석 일자')
    streak_count = models.PositiveIntegerField(default=1, help_text='연속 출석 일수')
    bonus_cash = models.PositiveIntegerField(default=0, help_text='지급 보너스 캐시')
    is_cycle_reward = models.BooleanField(default=False, help_text='7일 사이클 대형 보너스 여부')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_rewards_attendance'
        verbose_name = '출석'
        verbose_name_plural = '출석'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'], name='uniq_attendance_user_date',
            ),
        ]

    def __str__(self):
        return f'{self.user_id} {self.date} streak={self.streak_count}'


class Daily(models.Model):
    """데일리 현황 — 당일 문제수/적립/일일상한 체크용 집계. 하루 1건."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dailies',
    )
    date = models.DateField()
    quiz_count = models.PositiveIntegerField(default=0, help_text='당일 푼 문제 수')
    correct_count = models.PositiveIntegerField(default=0, help_text='당일 정답 수')
    boxes_earned = models.PositiveIntegerField(default=0, help_text='당일 획득 상자 수(일일 상한 체크)')
    cash_earned = models.BigIntegerField(default=0, help_text='당일 적립 캐시 합')
    ad_bonus_count = models.PositiveIntegerField(default=0, help_text='당일 광고 보너스 횟수')
    attended = models.BooleanField(default=False, help_text='당일 출석 여부')
    # 규칙 0: created_at 기본 + 갱신 추적 updated_at.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_rewards_daily'
        verbose_name = '데일리'
        verbose_name_plural = '데일리'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'], name='uniq_daily_user_date',
            ),
        ]

    def __str__(self):
        return f'{self.user_id} {self.date} quiz={self.quiz_count} cash={self.cash_earned}'
