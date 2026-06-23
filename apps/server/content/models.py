"""content 앱 — 학습 콘텐츠 도메인 (한자 / 단어 / 단어 뜻)."""
from django.db import models


class JLPTLevel(models.TextChoices):
    """JLPT 급수. 콘텐츠 앱 내 공용(미태깅 항목은 null)."""

    N1 = 'N1', 'N1'
    N2 = 'N2', 'N2'
    N3 = 'N3', 'N3'
    N4 = 'N4', 'N4'
    N5 = 'N5', 'N5'


class Kanji(models.Model):
    """한자(약 2,200자)."""

    character = models.CharField(max_length=10, unique=True, help_text='한자')
    meaning_ko = models.TextField(help_text='한국어 뜻 (예: 바칠 공)')
    components = models.TextField(blank=True, help_text='구성자')
    stroke_count = models.PositiveIntegerField(null=True, blank=True, help_text='획수')
    on_reading = models.CharField(max_length=100, blank=True, help_text='음독')
    kun_reading = models.CharField(max_length=100, blank=True, help_text='훈독')
    meaning_ja = models.TextField(blank=True, help_text='일본어 뜻')
    # 미태깅 한자가 있을 수 있어 null 허용.
    jlpt_level = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '한자'
        verbose_name_plural = '한자'
        indexes = [models.Index(fields=['jlpt_level'])]

    def __str__(self):
        return f'{self.character} ({self.meaning_ko[:10]})'


class Word(models.Model):
    """단어(약 7,000개)."""

    class WordType(models.TextChoices):
        KANA = 'kana', '가나'
        KANJI = 'kanji', '한자'

    surface = models.CharField(max_length=100, help_text='단어 표기(히라가나/한자 혼재)')
    word_type = models.CharField(max_length=10, choices=WordType.choices)
    reading = models.CharField(max_length=100, blank=True, help_text='읽기')
    # 품사: 파싱 완료 후 채움. 지금은 blank 허용.
    pos = models.CharField(max_length=50, blank=True, help_text='품사')
    # AI 태깅 예정 → null 허용.
    jlpt_level = models.CharField(
        max_length=2, choices=JLPTLevel.choices, null=True, blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '단어'
        verbose_name_plural = '단어'
        indexes = [
            models.Index(fields=['surface']),
            models.Index(fields=['jlpt_level']),
        ]

    def __str__(self):
        return self.surface


class WordMeaning(models.Model):
    """단어 뜻 (Word 1:N). 한 단어의 여러 뜻을 의미 순번으로 분리 저장."""

    word = models.ForeignKey(
        Word, on_delete=models.CASCADE, related_name='meanings',
    )
    sense_no = models.PositiveIntegerField(help_text='의미 순번(1,2,3…)')
    meaning_ko = models.TextField(help_text='정제된 개별 뜻')
    note = models.TextField(blank=True, help_text='부가 설명(예: 정중한 말)')
    # 규칙 0: 모든 모델에 created_at 기본.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '단어 뜻'
        verbose_name_plural = '단어 뜻'
        ordering = ['word', 'sense_no']
        constraints = [
            models.UniqueConstraint(
                fields=['word', 'sense_no'], name='uniq_word_sense_no',
            ),
        ]

    def __str__(self):
        return f'{self.word.surface} #{self.sense_no}: {self.meaning_ko[:20]}'
