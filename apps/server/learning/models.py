"""learning 앱 — 학습 상태 도메인 (SRS 상태 / 풀이 이력)."""
from django.conf import settings
from django.db import models


class ItemType(models.TextChoices):
    """학습 항목 종류. item_id 는 Word.id / Kanji.id / Kana.id 를 가리킨다(FK 아님)."""

    WORD = 'word', '단어'
    KANJI = 'kanji', '한자'
    KANA = 'kana', '가나'


class SrsState(models.Model):
    """SRS 학습 상태 — 유저 × 학습항목의 *현재* 상태(이력 아님). 출제 우선순위 결정에 사용.

    item_id 는 item_type 에 따라 Word.id 또는 Kanji.id 를 의미하는 논리 참조다.
    """

    class LastResult(models.TextChoices):
        CORRECT = 'correct', '정답'
        WRONG = 'wrong', '오답'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='srs_states',
    )
    item_type = models.CharField(max_length=10, choices=ItemType.choices)
    item_id = models.PositiveIntegerField(help_text='Word.id 또는 Kanji.id')
    ease = models.FloatField(default=2.5, help_text='SM-2 난이도 계수')
    interval_days = models.PositiveIntegerField(default=1, help_text='현재 복습 간격(일)')
    repetitions = models.PositiveIntegerField(default=0, help_text='연속 정답 횟수')
    due_at = models.DateTimeField(help_text='다음 복습 예정 시각')
    last_result = models.CharField(
        max_length=10, choices=LastResult.choices, null=True, blank=True,
    )
    # 규칙 0: created_at 기본 + 상태 변경 추적용 updated_at.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_learning_srsstate'
        verbose_name = 'SRS 상태'
        verbose_name_plural = 'SRS 상태'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'item_type', 'item_id'], name='uniq_user_item',
            ),
        ]
        indexes = [
            # 복습 기한 도래 항목 조회용.
            models.Index(fields=['user', 'due_at'], name='idx_srs_user_due'),
        ]

    def __str__(self):
        return f'{self.user_id}/{self.item_type}:{self.item_id} due={self.due_at:%Y-%m-%d}'


class QuizLog(models.Model):
    """문제 풀이 이력.

    보관 정책: 7일 보관 — created_at < now()-7d 행은 배치로 삭제(파티션 DROP 또는 배치 DELETE).
    장기 통계는 rewards.Daily 집계로 보존한다.
    """

    class Mode(models.TextChoices):
        WORD = 'word', '단어'
        KANJI = 'kanji', '한자'
        KANA = 'kana', '가나'

    class QuestionType(models.TextChoices):
        WORD_TO_MEANING = 'word_to_meaning', '단어→뜻'
        MEANING_TO_WORD = 'meaning_to_word', '뜻→단어'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_logs',
    )
    mode = models.CharField(max_length=10, choices=Mode.choices)
    item_type = models.CharField(max_length=10, choices=ItemType.choices)
    item_id = models.PositiveIntegerField()
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)
    is_correct = models.BooleanField()
    answer_ms = models.PositiveIntegerField(
        null=True, blank=True, help_text='응답 소요 시간(ms), 어뷰징 탐지용',
    )
    # 채점 멱등성 — 같은 문제 토큰의 재채점(더블탭/리플레이)을 unique 로 차단.
    # 기존 행 호환을 위해 null 허용(Postgres 는 NULL 다중 허용 → unique 무영향).
    token_hash = models.CharField(
        max_length=64, null=True, blank=True, unique=True,
        help_text='question_token 의 sha256. 재채점 방지용.',
    )
    jlpt_level = models.CharField(max_length=2, blank=True, help_text='출제 당시 문제 급수')
    # 정답으로 생성된 상자(상자가 삭제돼도 로그는 남도록 SET_NULL).
    box = models.ForeignKey(
        'rewards.CashBox', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quiz_logs',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_learning_quizlog'
        verbose_name = '퀴즈 로그'
        verbose_name_plural = '퀴즈 로그'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_quizlog_user_created'),
            # 7일 배치 삭제용(created_at 단독).
            models.Index(fields=['created_at'], name='idx_quizlog_created'),
        ]

    def __str__(self):
        return f'{self.user_id} {self.item_type}:{self.item_id} {"O" if self.is_correct else "X"}'


class QuizSet(models.Model):
    """10문제 세트 — 상자 3개 캡·1시간 쿨다운 단위."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_sets',
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    abandoned_at = models.DateTimeField(null=True, blank=True)
    boxes_earned = models.PositiveIntegerField(default=0)
    answered_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'tbl_learning_quizset'
        verbose_name = '퀴즈 세트'
        verbose_name_plural = '퀴즈 세트'
        indexes = [
            models.Index(fields=['user', 'completed_at'], name='idx_quizset_user_completed'),
        ]

    def __str__(self):
        return f'QuizSet(user={self.user_id}, answered={self.answered_count})'


class QuizSetItem(models.Model):
    """세트 내 문항 — choices/prompt/reading 은 생성 시 확정해 저장(재로드용)."""

    quiz_set = models.ForeignKey(QuizSet, on_delete=models.CASCADE, related_name='items')
    order = models.PositiveIntegerField()
    item_type = models.CharField(max_length=10, choices=ItemType.choices)
    # item_type='word'일 때 kanji_word/kana_word 구분. 그 외 null.
    word_type = models.CharField(max_length=10, null=True, blank=True)
    item_id = models.PositiveIntegerField()
    question_type = models.CharField(max_length=20)
    correct_index = models.PositiveIntegerField()
    prompt = models.CharField(max_length=200, blank=True)
    reading = models.CharField(max_length=100, blank=True)
    jlpt_level = models.CharField(max_length=2, blank=True)
    choices_json = models.JSONField(default=list, help_text='[{index, text}, ...] 셔플 완료 순서')
    answered = models.BooleanField(default=False)
    is_correct = models.BooleanField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_learning_quizsetitem'
        verbose_name = '세트 문항'
        verbose_name_plural = '세트 문항'
        constraints = [
            models.UniqueConstraint(fields=['quiz_set', 'order'], name='uniq_quizset_item_order'),
        ]

    def __str__(self):
        return f'QuizSetItem(set={self.quiz_set_id}, order={self.order})'


class Bookmark(models.Model):
    """학습 항목 북마크."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks',
    )
    item_type = models.CharField(max_length=10, choices=ItemType.choices)
    item_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_learning_bookmark'
        verbose_name = '북마크'
        verbose_name_plural = '북마크'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'item_type', 'item_id'], name='uniq_bookmark_user_item',
            ),
        ]

    def __str__(self):
        return f'Bookmark(user={self.user_id}, {self.item_type}:{self.item_id})'
