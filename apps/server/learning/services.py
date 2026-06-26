"""learning 서비스 — 퀴즈 출제(SRS + 오답 생성) / 채점(SM-2 + 로그 + 보상).

보안 원칙(CLAUDE.md):
  - 정답 판정은 서버에서만. 클라이언트가 보낸 is_correct 를 신뢰하지 않는다.
  - 정답 인덱스는 *서명된 토큰*(TTL)에 담아 내려보내, 클라가 정답을 알 수 없게 한다.
"""
import hashlib
import random
from datetime import timedelta

from django.core import signing
from django.db import IntegrityError, transaction
from django.utils import timezone

from content.models import Kana, Kanji, Word, WordMeaning
from rewards.models import CashBox

from .models import ItemType, QuizLog, SrsState

QUESTION_SALT = 'japavoca.quiz.question'
QUESTION_TTL_SECONDS = 300  # 5분
MAX_BOXES_PER_DAY = 50      # 일일 상자 획득 상한(어뷰징 방지)

# 정답 등급 가중치(상자 생성 시). 개봉 시 캐시 보상은 rewards.services 에서 결정.
_BOX_GRADE_WEIGHTS = [
    (CashBox.Grade.NORMAL, 140),     # 70.0%
    (CashBox.Grade.RARE, 28),        # 14.0%
    (CashBox.Grade.EPIC, 23),        # 11.5%
    (CashBox.Grade.LEGENDARY, 8),    #  4.0%
    (CashBox.Grade.JACKPOT, 1),      #  0.5%
]


class QuizError(Exception):
    """퀴즈 처리 오류."""


class NoContent(QuizError):
    """출제할 콘텐츠가 부족함."""


class InvalidQuestionToken(QuizError):
    """문제 토큰이 위조/만료됨."""


def _item_texts(item_type, item_id):
    """(surface, meaning) 반환. 없으면 빈 문자열.

    KANA: surface=글자(あ), meaning=로마자(a).
    """
    if item_type == ItemType.WORD:
        word = Word.objects.filter(id=item_id).first()
        if not word:
            return '', ''
        wm = WordMeaning.objects.filter(word_id=item_id).order_by('sense_no').first()
        return word.surface, (wm.meaning_ko if wm else '')
    if item_type == ItemType.KANA:
        kana = Kana.objects.filter(id=item_id).first()
        if not kana:
            return '', ''
        return kana.character, kana.romaji
    kanji = Kanji.objects.filter(id=item_id).first()
    if not kanji:
        return '', ''
    return kanji.character, kanji.meaning_ko


def _item_extra(item_type, item_id):
    """(reading, jlpt_level) 반환. 문제 카드 부가 표시용.

    reading: 단어는 Word.reading(표기와 같으면=가나 단어면 생략), 한자는 음·훈독 결합.
    jlpt_level: 미태깅이면 빈 문자열.
    """
    if item_type == ItemType.WORD:
        word = (
            Word.objects.filter(id=item_id)
            .only('reading', 'surface', 'jlpt_level').first()
        )
        if not word:
            return '', ''
        reading = word.reading if (word.reading and word.reading != word.surface) else ''
        return reading, (word.jlpt_level or '')
    if item_type == ItemType.KANA:
        return '', ''  # 가나는 읽기/급수 없음
    kanji = (
        Kanji.objects.filter(id=item_id)
        .only('on_reading', 'kun_reading', 'jlpt_level').first()
    )
    if not kanji:
        return '', ''
    reading = ' · '.join(p for p in (kanji.on_reading, kanji.kun_reading) if p)
    return reading, (kanji.jlpt_level or '')


def resolve_study(user):
    """user.study_mode → (item_type, subtype|None, level|None) 반환.

    한자→(KANJI, None, level) / 한자단어→(WORD, 'kanji', level) / 가나단어→(WORD, 'kana', level).
    가나→(KANA, script|None, None). script: 'hira'|'kata'|None(둘 다 선택).
    study 미설정이면 NoContent.
    """
    mode = user.study_mode
    if mode == 'kanji':
        return ItemType.KANJI, None, user.study_level
    if mode == 'kanji_word':
        return ItemType.WORD, Word.WordType.KANJI, user.study_level
    if mode == 'kana_word':
        return ItemType.WORD, Word.WordType.KANA, user.study_level
    if mode == 'kana':
        hira = user.study_kana_hiragana
        kata = user.study_kana_katakana
        if not hira and not kata:
            raise NoContent('가나 스크립트를 선택해주세요.')
        if hira and not kata:
            script = Kana.Script.HIRA
        elif kata and not hira:
            script = Kana.Script.KATA
        else:
            script = None  # 둘 다 — 필터 없음
        return ItemType.KANA, script, None
    raise NoContent('학습 트랙이 설정되지 않았습니다.')


def _pick_item_id(user, item_type, word_type, level):
    """SRS 기한 도래 항목 우선, 없으면 미학습 신규 항목(study_mode 의 word_type/급수 적용).

    kanji_word ↔ kana_word 오염 방지: due 쿼리도 현재 트랙의 word_type 로 제한한다.
    (SrsState 에 word_type 컬럼이 없으므로 Word 서브쿼리로 필터.)
    """
    now = timezone.now()
    if item_type == ItemType.WORD:
        model = Word
    elif item_type == ItemType.KANA:
        model = Kana
    else:
        model = Kanji

    # 현재 트랙에 속하는 item_id 집합(서브쿼리).
    track_qs = model.objects.all()
    if item_type == ItemType.WORD and word_type:
        track_qs = track_qs.filter(word_type=word_type)
    elif item_type == ItemType.KANA and word_type:
        track_qs = track_qs.filter(script=word_type)
    track_ids = track_qs.values('id')

    due = (
        SrsState.objects
        .filter(user=user, item_type=item_type, due_at__lte=now, item_id__in=track_ids)
        .order_by('due_at')
        .values_list('item_id', flat=True)
        .first()
    )
    if due is not None:
        return due

    seen = SrsState.objects.filter(user=user, item_type=item_type).values_list('item_id', flat=True)
    qs = track_qs.exclude(id__in=seen)
    if level:
        leveled = qs.filter(jlpt_level=level)
        if leveled.exists():
            qs = leveled
    return qs.order_by('?').values_list('id', flat=True).first()


def _distractor_texts(item_type, item_id, dimension, correct_text, n=3):
    """같은 종류의 다른 항목들에서 오답 텍스트 n개 수집(중복/정답 제외)."""
    if item_type == ItemType.WORD:
        model = Word
    elif item_type == ItemType.KANA:
        model = Kana
    else:
        model = Kanji
    out = []
    for oid in (
        model.objects.exclude(id=item_id).order_by('?').values_list('id', flat=True)[:60]
    ):
        surface, meaning = _item_texts(item_type, oid)
        text = meaning if dimension == 'meaning' else surface
        if text and text != correct_text and text not in out:
            out.append(text)
        if len(out) >= n:
            break
    return out


def build_question(user):
    """문제 1개 생성. 출제 종류·급수는 user.study_mode 로 결정.

    반환: {question_token, mode, item_type, question_type, prompt, choices:[{index,text}]}
    """
    item_type, word_type, level = resolve_study(user)
    item_id = _pick_item_id(user, item_type, word_type, level)
    if item_id is None:
        raise NoContent('출제할 항목이 없습니다.')

    surface, meaning = _item_texts(item_type, item_id)
    if not surface or not meaning:
        raise NoContent('항목의 표기/뜻 데이터가 부족합니다.')

    if item_type == ItemType.KANA:
        # 가나는 글자→로마자 방향만. 로마자→글자는 じ·ぢ 등 동음 이자(異字) 문제로 정답이 모호.
        question_type = QuizLog.QuestionType.WORD_TO_MEANING
    else:
        question_type = random.choice(
            [QuizLog.QuestionType.WORD_TO_MEANING, QuizLog.QuestionType.MEANING_TO_WORD]
        )
    if question_type == QuizLog.QuestionType.WORD_TO_MEANING:
        prompt, correct_text, dimension = surface, meaning, 'meaning'
    else:
        prompt, correct_text, dimension = meaning, surface, 'surface'

    distractors = _distractor_texts(item_type, item_id, dimension, correct_text)
    if len(distractors) < 3:
        raise NoContent('오답 보기를 만들 콘텐츠가 부족합니다.')

    options = distractors[:3] + [correct_text]
    random.shuffle(options)
    correct_index = options.index(correct_text)

    # 부가 표시: 읽기는 표기(단어/한자)를 묻는 word_to_meaning 일 때만 의미가 있다.
    # (meaning_to_word 는 prompt 가 한국어 뜻이라 읽기를 같이 주면 정답이 노출됨)
    reading_raw, jlpt_level = _item_extra(item_type, item_id)
    reading = reading_raw if question_type == QuizLog.QuestionType.WORD_TO_MEANING else ''

    token = signing.dumps(
        {'it': item_type, 'id': int(item_id), 'qt': question_type, 'ci': correct_index},
        salt=QUESTION_SALT,
    )
    return {
        'question_token': token,
        'mode': item_type,
        'item_type': item_type,
        'question_type': question_type,
        'prompt': prompt,
        'reading': reading,
        'jlpt_level': jlpt_level,
        'choices': [{'index': i, 'text': t} for i, t in enumerate(options)],
    }


def _apply_sm2(state, is_correct):
    """SM-2 간이 적용. 상태를 갱신만 하고 저장은 호출부에서."""
    quality = 5 if is_correct else 2
    if is_correct:
        if state.repetitions == 0:
            state.interval_days = 1
        elif state.repetitions == 1:
            state.interval_days = 6
        else:
            state.interval_days = max(1, round(state.interval_days * state.ease))
        state.repetitions += 1
    else:
        state.repetitions = 0
        state.interval_days = 1
    state.ease = max(1.3, state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    state.last_result = (
        SrsState.LastResult.CORRECT if is_correct else SrsState.LastResult.WRONG
    )
    state.due_at = timezone.now() + timedelta(days=state.interval_days)


def _roll_box_grade():
    grades, weights = zip(*_BOX_GRADE_WEIGHTS)
    return random.choices(grades, weights=weights, k=1)[0]


@transaction.atomic
def grade_answer(user, question_token, choice_index, answer_ms=None):
    """답안 채점. SRS 갱신 + QuizLog 기록 + Daily 갱신 + 정답 시 상자 생성(일일 상한)."""
    try:
        payload = signing.loads(question_token, salt=QUESTION_SALT, max_age=QUESTION_TTL_SECONDS)
    except signing.BadSignature as exc:
        raise InvalidQuestionToken('문제 토큰이 유효하지 않거나 만료되었습니다.') from exc

    item_type = payload['it']
    item_id = payload['id']
    question_type = payload['qt']
    is_correct = int(choice_index) == int(payload['ci'])

    # 0) 멱등성 — 같은 토큰의 재채점(더블탭/리플레이)을 차단. 흔한 경우는 사전
    #    조회로 빠르게 거부하고, 동시 요청 경합은 QuizLog.token_hash unique 가
    #    최종 방어한다(아래 4번).
    token_hash = hashlib.sha256(question_token.encode()).hexdigest()
    if QuizLog.objects.filter(token_hash=token_hash).exists():
        raise InvalidQuestionToken('이미 채점된 문제입니다.')

    # 1) SRS 상태 갱신(없으면 생성).
    state, _ = SrsState.objects.select_for_update().get_or_create(
        user=user, item_type=item_type, item_id=item_id,
        defaults={'due_at': timezone.now()},
    )
    _apply_sm2(state, is_correct)
    state.save()

    # 2) Daily 집계(없으면 생성, 행 잠금).
    from rewards.models import Daily
    today = timezone.localdate()
    Daily.objects.get_or_create(user=user, date=today)
    daily = Daily.objects.select_for_update().get(user=user, date=today)

    # 3) 정답이면 일일 상한 내에서 상자 생성.
    box = None
    if is_correct and daily.boxes_earned < MAX_BOXES_PER_DAY:
        box = CashBox.objects.create(user=user, grade=_roll_box_grade())
        daily.boxes_earned += 1

    # 4) 퀴즈 로그 기록.
    jlpt = ''
    if item_type == ItemType.WORD:
        w = Word.objects.filter(id=item_id).only('jlpt_level').first()
        jlpt = (w.jlpt_level or '') if w else ''
    elif item_type == ItemType.KANJI:
        k = Kanji.objects.filter(id=item_id).only('jlpt_level').first()
        jlpt = (k.jlpt_level or '') if k else ''
    # KANA: jlpt 없음, jlpt='' 그대로

    # token_hash unique 충돌 = 동시 요청이 사전 조회를 함께 통과한 경우.
    # savepoint(중첩 atomic) 안에서 create 하여 IntegrityError 시 깔끔히 거부하고,
    # 바깥 트랜잭션 전체(SRS/상자/Daily)를 롤백한다.
    try:
        with transaction.atomic():
            QuizLog.objects.create(
                user=user, mode=item_type, item_type=item_type, item_id=item_id,
                question_type=question_type, is_correct=is_correct,
                answer_ms=answer_ms, jlpt_level=jlpt, box=box, token_hash=token_hash,
            )
    except IntegrityError as exc:
        raise InvalidQuestionToken('이미 채점된 문제입니다.') from exc

    daily.quiz_count += 1
    if is_correct:
        daily.correct_count += 1
    daily.save(update_fields=['quiz_count', 'correct_count', 'boxes_earned', 'updated_at'])

    return {
        'is_correct': is_correct,
        'correct_index': int(payload['ci']),
        'srs': {
            'repetitions': state.repetitions,
            'interval_days': state.interval_days,
            'ease': round(state.ease, 3),
            'due_at': state.due_at,
        },
        'box_id': box.id if box else None,
        'box_grade': box.grade if box else None,
    }
