"""learning 서비스 — 퀴즈 출제(SRS + 오답 생성) / 채점(SM-2 + 로그 + 보상).

보안 원칙(CLAUDE.md):
  - 정답 판정은 서버에서만. 클라이언트가 보낸 is_correct 를 신뢰하지 않는다.
  - 정답 인덱스는 *서명된 토큰*(TTL)에 담아 내려보내, 클라가 정답을 알 수 없게 한다.
"""
import random
from datetime import timedelta

from django.core import signing
from django.db import transaction
from django.utils import timezone

from content.models import Kanji, Word, WordMeaning
from rewards.models import CashBox

from .models import ItemType, QuizLog, SrsState

QUESTION_SALT = 'japavoca.quiz.question'
QUESTION_TTL_SECONDS = 300  # 5분
MAX_BOXES_PER_DAY = 50      # 일일 상자 획득 상한(어뷰징 방지)

# 정답 등급 가중치(상자 생성 시). 개봉 시 캐시 보상은 rewards.services 에서 결정.
_BOX_GRADE_WEIGHTS = [
    (CashBox.Grade.NORMAL, 80),
    (CashBox.Grade.RARE, 18),
    (CashBox.Grade.JACKPOT, 2),
]


class QuizError(Exception):
    """퀴즈 처리 오류."""


class NoContent(QuizError):
    """출제할 콘텐츠가 부족함."""


class InvalidQuestionToken(QuizError):
    """문제 토큰이 위조/만료됨."""


def _item_texts(item_type, item_id):
    """(surface, meaning) 반환. 없으면 빈 문자열."""
    if item_type == ItemType.WORD:
        word = Word.objects.filter(id=item_id).first()
        if not word:
            return '', ''
        wm = WordMeaning.objects.filter(word_id=item_id).order_by('sense_no').first()
        return word.surface, (wm.meaning_ko if wm else '')
    kanji = Kanji.objects.filter(id=item_id).first()
    if not kanji:
        return '', ''
    return kanji.character, kanji.meaning_ko


def _pick_item_id(user, item_type):
    """SRS 기한 도래 항목 우선, 없으면 미학습 신규 항목(가능하면 유저 급수)."""
    now = timezone.now()
    due = (
        SrsState.objects
        .filter(user=user, item_type=item_type, due_at__lte=now)
        .order_by('due_at')
        .values_list('item_id', flat=True)
        .first()
    )
    if due is not None:
        return due

    seen = SrsState.objects.filter(user=user, item_type=item_type).values_list('item_id', flat=True)
    model = Word if item_type == ItemType.WORD else Kanji
    qs = model.objects.exclude(id__in=seen)
    if user.selected_jlpt_level:
        leveled = qs.filter(jlpt_level=user.selected_jlpt_level)
        if leveled.exists():
            qs = leveled
    obj_id = qs.order_by('?').values_list('id', flat=True).first()
    return obj_id


def _distractor_texts(item_type, item_id, dimension, correct_text, n=3):
    """같은 종류의 다른 항목들에서 오답 텍스트 n개 수집(중복/정답 제외)."""
    model = Word if item_type == ItemType.WORD else Kanji
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


def build_question(user, mode):
    """문제 1개 생성. mode in {'word','kanji'}.

    반환: {question_token, mode, item_type, question_type, prompt, choices:[{index,text}]}
    """
    item_type = ItemType.WORD if mode == ItemType.WORD else ItemType.KANJI
    item_id = _pick_item_id(user, item_type)
    if item_id is None:
        raise NoContent('출제할 항목이 없습니다.')

    surface, meaning = _item_texts(item_type, item_id)
    if not surface or not meaning:
        raise NoContent('항목의 표기/뜻 데이터가 부족합니다.')

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

    token = signing.dumps(
        {'it': item_type, 'id': int(item_id), 'qt': question_type, 'ci': correct_index},
        salt=QUESTION_SALT,
    )
    return {
        'question_token': token,
        'mode': mode,
        'item_type': item_type,
        'question_type': question_type,
        'prompt': prompt,
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
    _, item_meaning = item_type, None
    jlpt = ''
    if item_type == ItemType.WORD:
        w = Word.objects.filter(id=item_id).only('jlpt_level').first()
        jlpt = (w.jlpt_level or '') if w else ''
    else:
        k = Kanji.objects.filter(id=item_id).only('jlpt_level').first()
        jlpt = (k.jlpt_level or '') if k else ''

    QuizLog.objects.create(
        user=user, mode=item_type, item_type=item_type, item_id=item_id,
        question_type=question_type, is_correct=is_correct,
        answer_ms=answer_ms, jlpt_level=jlpt, box=box,
    )

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
