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
from django.db.models import F
from django.utils import timezone

from content.models import Kana, KanaExample, Kanji, Word, WordExample, WordMeaning
from rewards.models import CashBox

from .models import Bookmark, ItemType, QuizLog, QuizSet, QuizSetItem, SrsState

QUESTION_SALT = 'japavoca.quiz.question'
QUESTION_TTL_SECONDS = 300  # 단발(/next/) 경로 전용 TTL. 세트 토큰은 set_id 생존으로 검증.
MAX_BOXES_PER_DAY = 50      # ⚠️ 임시 테스트값 50 — 원래 정한 값은 20. 배포 전 원복

SET_SIZE = 10
SET_COOLDOWN = timedelta(seconds=30)
# 학습 하루 경계(리셋 시각). 이 시각 이전에 시작한 미완료 세트는 재개하지 않고 폐기한다.
# 세트는 시작 시점에 10문제를 뽑아 두므로, 하루가 지나면 SRS 기한이 바뀐 낡은 문제가 된다.
# 자정이 아니라 사람 적은 새벽 3시로 끊어 리셋 순간에 학습이 잘리는 사용자를 줄인다.
SET_RESET_HOUR = 3

QUIZ_MILESTONE_INTERVAL = 10  # 당일 정답 N개마다(리셋: 매일 0) 캐시 직접 지급. 세트/상자와 무관.
QUIZ_MILESTONE_BONUS = 10
QUIZ_MILESTONE_MAX = 20  # 하루 최대 여기까지만(10, 20). 그 이후로는 더 지급 안 함.

# 정답 시 상자 등급 가중치 (⚠️ 임시 테스트값 50/50 — 배포 전 90/10 원복)
_BOX_GRADE_WEIGHTS = [
    (CashBox.Grade.NORMAL, 30),
    (CashBox.Grade.PURPLE, 40),
    (CashBox.Grade.BURGUNDY, 30),  # ⚠️ 임시 테스트값 30% — 배포 전 반드시 낮출 것
]

# 묶음 상자 — 확률로 보상 개수를 늘린다. 인벤토리·광고 횟수는 1개로 세고 캐시만 여러 번 뽑는다.
# ⚠️ 임시 테스트값 50% — 기대 지급액이 2배가 되므로 배포 전 반드시 낮춰야 한다.
# ⚠️ 확률은 반드시 서버에서만 굴린다(클라이언트 값 신뢰 금지).
BOX_BURST_CHANCE = 0.5
BOX_BURST_COUNT = 3


class QuizError(Exception):
    pass


class NoContent(QuizError):
    pass


class InvalidQuestionToken(QuizError):
    pass


def _item_texts(item_type, item_id):
    """(surface, meaning) 반환."""
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
    """(reading, jlpt_level) 반환."""
    if item_type == ItemType.WORD:
        word = Word.objects.filter(id=item_id).only('reading', 'surface', 'jlpt_level').first()
        if not word:
            return '', ''
        reading = word.reading if (word.reading and word.reading != word.surface) else ''
        return reading, (word.jlpt_level or '')
    if item_type == ItemType.KANA:
        return '', ''
    kanji = Kanji.objects.filter(id=item_id).only('on_reading', 'kun_reading', 'jlpt_level').first()
    if not kanji:
        return '', ''
    reading = ' · '.join(p for p in (kanji.on_reading, kanji.kun_reading) if p)
    return reading, (kanji.jlpt_level or '')


def _item_detail(item_type, item_id, word_type=None):
    """해설 패널용 상세 데이터 딕셔너리."""
    if item_type == ItemType.KANA:
        kana = Kana.objects.filter(id=item_id).first()
        if not kana:
            return {}
        examples = KanaExample.objects.filter(kana_id=item_id).order_by('?')[:2]
        example_words = [
            {'surface': ex.surface, 'kanji': ex.kanji, 'meaning': ex.meaning_ko}
            for ex in examples
        ]
        return {
            'surface': kana.character,
            'reading': kana.romaji,
            'meaning': kana.romaji,
            'components': '',
            'stroke_count': None,
            'on_reading': '',
            'kun_reading': '',
            'script': kana.script,
            'example_words': example_words,
        }
    if item_type == ItemType.KANJI:
        kanji = Kanji.objects.filter(id=item_id).first()
        if not kanji:
            return {}
        return {
            'surface': kanji.character,
            'reading': ' / '.join(p for p in (kanji.on_reading, kanji.kun_reading) if p),
            'meaning': kanji.meaning_ko,
            'components': kanji.components,
            'stroke_count': kanji.stroke_count,
            'on_reading': kanji.on_reading,
            'kun_reading': kanji.kun_reading,
            'script': None,
        }
    # WORD
    word = Word.objects.filter(id=item_id).first()
    if not word:
        return {}
    wm = WordMeaning.objects.filter(word_id=item_id).order_by('sense_no').first()
    meaning = wm.meaning_ko if wm else ''
    components = ''
    examples = []
    if word_type == 'kanji':
        kanji_chars = [c for c in word.surface if '一' <= c <= '鿿']
        parts = []
        for char in kanji_chars[:3]:
            k = Kanji.objects.filter(character=char).only('meaning_ko').first()
            if k and k.meaning_ko:
                parts.append(f'{char} : {k.meaning_ko}')
        components = ' / '.join(parts)
    elif word_type == 'kana':
        # 가나 단어 예문(한자 단어는 row 자체가 없음). sort_no 순, 최대 3개.
        examples = [
            {'origin': ex.origin, 'reading': ex.reading, 'translation': ex.translation}
            for ex in WordExample.objects.filter(word_id=item_id)
            .order_by('sort_no')[:3]
        ]
    return {
        'surface': word.surface,
        'reading': word.reading,
        'meaning': meaning,
        'components': components,
        'stroke_count': None,
        'on_reading': '',
        'kun_reading': '',
        'script': None,
        'examples': examples,
    }


def _get_jlpt(item_type, item_id):
    """QuizLog 기록용 jlpt_level."""
    if item_type == ItemType.WORD:
        w = Word.objects.filter(id=item_id).only('jlpt_level').first()
        return (w.jlpt_level or '') if w else ''
    if item_type == ItemType.KANJI:
        k = Kanji.objects.filter(id=item_id).only('jlpt_level').first()
        return (k.jlpt_level or '') if k else ''
    return ''


def resolve_study(user):
    """user.study_mode → (item_type, subtype|None, level|None) 반환."""
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
            script = None
        return ItemType.KANA, script, None
    raise NoContent('학습 트랙이 설정되지 않았습니다.')


def _pick_item_id(user, item_type, word_type, level, exclude_ids=None):
    """SRS 기한 도래 우선, 없으면 신규. exclude_ids 로 세트 내 중복 방지."""
    now = timezone.now()
    if item_type == ItemType.WORD:
        model = Word
    elif item_type == ItemType.KANA:
        model = Kana
    else:
        model = Kanji

    track_qs = model.objects.all()
    if item_type == ItemType.WORD and word_type:
        track_qs = track_qs.filter(word_type=word_type)
    elif item_type == ItemType.KANA and word_type:
        track_qs = track_qs.filter(script=word_type)
    # jlpt_level 없는 항목은 퀴즈에서 제외 (한자만 — Word/Kana는 데이터 없음)
    if item_type == ItemType.KANJI:
        track_qs = track_qs.exclude(jlpt_level__isnull=True).exclude(jlpt_level='')
    track_ids = track_qs.values('id')

    due_qs = SrsState.objects.filter(
        user=user, item_type=item_type, due_at__lte=now, item_id__in=track_ids,
    )
    if exclude_ids:
        due_qs = due_qs.exclude(item_id__in=exclude_ids)
    due = due_qs.order_by('due_at').values_list('item_id', flat=True).first()
    if due is not None:
        return due

    seen = SrsState.objects.filter(user=user, item_type=item_type).values_list('item_id', flat=True)
    qs = track_qs.exclude(id__in=seen)
    if exclude_ids:
        qs = qs.exclude(id__in=exclude_ids)
    if level:
        leveled = qs.filter(jlpt_level=level)
        if leveled.exists():
            qs = leveled
    return qs.order_by('?').values_list('id', flat=True).first()


# 오답을 뽑을 급수 풀 — 정답 급수 기준 "자기 급수 + 한 단계 쉬운 급수".
# 전체에서 아무거나 뽑으면 난이도가 튀는 오답이 섞여 몰라도 소거법으로 맞힐 수 있다.
# N5는 더 쉬운 급수가 없으므로 한 단계 어려운 N4를 대신 쓴다.
DISTRACTOR_LEVELS = {
    'N5': ('N5', 'N4'),
    'N4': ('N4', 'N5'),
    'N3': ('N3', 'N4'),
    'N2': ('N2', 'N3'),
    'N1': ('N1', 'N2'),
}


def _collect_distractors(item_type, qs, dimension, correct_text, out, n):
    """qs에서 오답 텍스트를 out에 채운다(중복·정답 제외). 채운 개수 반환."""
    for oid in qs.order_by('?').values_list('id', flat=True)[:60]:
        surface, meaning = _item_texts(item_type, oid)
        text = meaning if dimension == 'meaning' else surface
        if text and text != correct_text and text not in out:
            out.append(text)
        if len(out) >= n:
            break
    return len(out)


def _distractor_texts(item_type, item_id, dimension, correct_text, n=3, level=''):
    """같은 종류에서 오답 텍스트 n개 수집.

    급수를 아는 항목(한자·단어)은 비슷한 급수에서 먼저 뽑는다. 그 풀이 얕아 n개를
    못 채우면 전체로 넓혀 채운다 — 오답이 모자라면 문제 자체가 버려지기 때문이다.
    가나는 급수 데이터가 없어 항상 전체에서 뽑는다.
    """
    if item_type == ItemType.WORD:
        model = Word
    elif item_type == ItemType.KANA:
        model = Kana
    else:
        model = Kanji

    base = model.objects.exclude(id=item_id)
    out = []

    pool_levels = DISTRACTOR_LEVELS.get(level)
    if pool_levels and item_type != ItemType.KANA:
        _collect_distractors(
            item_type, base.filter(jlpt_level__in=pool_levels), dimension, correct_text, out, n,
        )
        if len(out) >= n:
            return out

    _collect_distractors(item_type, base, dimension, correct_text, out, n)
    return out


def _roll_box_grade():
    grades, weights = zip(*_BOX_GRADE_WEIGHTS)
    return random.choices(grades, weights=weights, k=1)[0]


def _roll_burst_count():
    """이 상자가 몇 개의 보상을 줄지. 상자 개수는 어차피 1개이므로 상한과 무관하다."""
    return BOX_BURST_COUNT if random.random() < BOX_BURST_CHANCE else 1


def _build_question_data(user, item_type, word_type, level, exclude_ids=None):
    """문제 1개 데이터를 반환(token 미포함). 공통 로직."""
    item_id = _pick_item_id(user, item_type, word_type, level, exclude_ids=exclude_ids)
    if item_id is None:
        return None

    surface, meaning = _item_texts(item_type, item_id)
    if not surface or not meaning:
        return None

    if item_type == ItemType.KANA:
        question_type = QuizLog.QuestionType.WORD_TO_MEANING
    else:
        question_type = random.choice(
            [QuizLog.QuestionType.WORD_TO_MEANING, QuizLog.QuestionType.MEANING_TO_WORD]
        )

    if question_type == QuizLog.QuestionType.WORD_TO_MEANING:
        prompt, correct_text, dimension = surface, meaning, 'meaning'
    else:
        prompt, correct_text, dimension = meaning, surface, 'surface'

    reading_raw, jlpt_level = _item_extra(item_type, item_id)

    distractors = _distractor_texts(
        item_type, item_id, dimension, correct_text, level=jlpt_level,
    )
    if len(distractors) < 3:
        return None

    options = distractors[:3] + [correct_text]
    random.shuffle(options)
    correct_index = options.index(correct_text)

    reading = reading_raw if question_type == QuizLog.QuestionType.WORD_TO_MEANING else ''

    return {
        'item_id': item_id,
        'item_type': item_type,
        'word_type': word_type if item_type == ItemType.WORD else None,
        'question_type': question_type,
        'prompt': prompt,
        'reading': reading,
        'jlpt_level': jlpt_level,
        'choices': [{'index': i, 'text': t} for i, t in enumerate(options)],
        'correct_index': correct_index,
    }


# ── 단발 출제 (기존 /next/ 경로용, 잠금화면 단발 등) ───────────────────────────────

def build_question(user):
    """문제 1개 생성 (단발 토큰, TTL 5분)."""
    item_type, word_type, level = resolve_study(user)
    data = _build_question_data(user, item_type, word_type, level)
    if data is None:
        raise NoContent('출제할 항목이 없습니다.')

    reading_raw, jlpt_level = _item_extra(item_type, data['item_id'])
    reading = reading_raw if data['question_type'] == QuizLog.QuestionType.WORD_TO_MEANING else ''

    token = signing.dumps(
        {
            'it': data['item_type'], 'id': int(data['item_id']),
            'qt': data['question_type'], 'ci': data['correct_index'],
        },
        salt=QUESTION_SALT,
    )
    return {
        'question_token': token,
        'mode': data['item_type'],
        'item_type': data['item_type'],
        'question_type': data['question_type'],
        'prompt': data['prompt'],
        'reading': reading,
        'jlpt_level': jlpt_level,
        'choices': data['choices'],
    }


# ── 세트 출제 ────────────────────────────────────────────────────────────────────

def _serialize_existing_set(quiz_set):
    """DB에 저장된 세트를 응답 형태로 직렬화."""
    items = quiz_set.items.order_by('order')
    questions = []
    for item in items:
        token = signing.dumps(
            {
                'it': item.item_type, 'id': item.item_id,
                'qt': item.question_type, 'ci': item.correct_index,
                'sid': quiz_set.id, 'ord': item.order,
            },
            salt=QUESTION_SALT,
        )
        detail = _item_detail(item.item_type, item.item_id, word_type=item.word_type)
        questions.append({
            'order': item.order,
            'question_token': token,
            'item_type': item.item_type,
            'item_id': item.item_id,
            'word_type': item.word_type,
            'question_type': item.question_type,
            'prompt': item.prompt,
            'reading': item.reading,
            'jlpt_level': item.jlpt_level,
            'choices': item.choices_json,
            'answer_index': item.correct_index,
            'detail': detail,
            'answered': item.answered,
        })
    return {
        'set_id': quiz_set.id,
        'cooldown_until': None,
        'questions': questions,
    }


def abandon_quiz_set(user):
    """활성 세트(미완료·미폐기)를 폐기. 없으면 no-op."""
    QuizSet.objects.filter(
        user=user,
        completed_at__isnull=True,
        abandoned_at__isnull=True,
    ).update(abandoned_at=timezone.now())


def _last_reset_cutoff(now=None):
    """직전 리셋 경계(오늘 또는 어제 새벽 SET_RESET_HOUR시). 이 시각 이전 세트는 낡음."""
    now = timezone.localtime(now or timezone.now())
    cutoff = now.replace(hour=SET_RESET_HOUR, minute=0, second=0, microsecond=0)
    if now < cutoff:  # 리셋 시각 전(예: 새벽 1시)이면 어제 경계가 기준
        cutoff -= timedelta(days=1)
    return cutoff


def build_quiz_set(user):
    """현재 활성 세트 반환 or 신규 생성. 쿨다운 중이면 questions=[] + cooldown_until."""
    # 1. 미완료 활성 세트
    active = (
        QuizSet.objects.filter(user=user, completed_at__isnull=True, abandoned_at__isnull=True)
        .prefetch_related('items')
        .order_by('-started_at')
        .first()
    )
    if active:
        # 리셋 경계 이전에 시작한 세트는 낡은 문제 세트다 — 폐기하고 아래에서 새로 만든다.
        if active.started_at < _last_reset_cutoff():
            active.abandoned_at = timezone.now()
            active.save(update_fields=['abandoned_at'])
            active = None
    if active:
        # 모든 문항이 이미 answered됐지만 completed_at이 없는 좀비 세트 처리
        all_answered = active.items.exists() and not active.items.filter(answered=False).exists()
        if all_answered:
            active.completed_at = timezone.now()
            active.save(update_fields=['completed_at'])
        else:
            return _serialize_existing_set(active)

    # 2. 쿨다운 체크
    last_done = (
        QuizSet.objects.filter(user=user, completed_at__isnull=False)
        .order_by('-completed_at')
        .first()
    )
    if last_done and last_done.completed_at + SET_COOLDOWN > timezone.now():
        return {
            'set_id': last_done.id,
            'cooldown_until': (last_done.completed_at + SET_COOLDOWN).isoformat(),
            'questions': [],
        }

    # 3. 신규 세트 생성
    item_type, word_type, level = resolve_study(user)
    seen_ids: set = set()
    items_data = []

    for order in range(1, SET_SIZE + 1):
        data = _build_question_data(user, item_type, word_type, level, exclude_ids=seen_ids)
        if data is None:
            break
        seen_ids.add(data['item_id'])
        detail = _item_detail(data['item_type'], data['item_id'], word_type=data['word_type'])
        items_data.append({**data, 'order': order, 'detail': detail})

    if not items_data:
        raise NoContent('출제할 항목이 없습니다.')

    with transaction.atomic():
        quiz_set = QuizSet.objects.create(user=user)
        for d in items_data:
            QuizSetItem.objects.create(
                quiz_set=quiz_set,
                order=d['order'],
                item_type=d['item_type'],
                word_type=d['word_type'],
                item_id=d['item_id'],
                question_type=d['question_type'],
                correct_index=d['correct_index'],
                prompt=d['prompt'],
                reading=d['reading'],
                jlpt_level=d['jlpt_level'],
                choices_json=d['choices'],
            )
            token = signing.dumps(
                {
                    'it': d['item_type'], 'id': int(d['item_id']),
                    'qt': d['question_type'], 'ci': d['correct_index'],
                    'sid': quiz_set.id, 'ord': d['order'],
                },
                salt=QUESTION_SALT,
            )
            d['question_token'] = token

    return {
        'set_id': quiz_set.id,
        'cooldown_until': None,
        'questions': [
            {
                'order': d['order'],
                'question_token': d['question_token'],
                'item_type': d['item_type'],
                'item_id': d['item_id'],
                'word_type': d['word_type'],
                'question_type': d['question_type'],
                'prompt': d['prompt'],
                'reading': d['reading'],
                'jlpt_level': d['jlpt_level'],
                'choices': d['choices'],
                'answer_index': d['correct_index'],
                'detail': d['detail'],
                'answered': False,
            }
            for d in items_data
        ],
    }


# ── 채점 ─────────────────────────────────────────────────────────────────────────

# 정답 사다리 초반 간격(일). repetitions 0→3일, 1→10일, 2회차부터는 ease 배율.
SRS_FIRST_INTERVAL = 3
SRS_SECOND_INTERVAL = 10
# 오답 시 다시 나오기까지(일).
SRS_LAPSE_INTERVAL = 3


def _apply_sm2(state, is_correct):
    quality = 5 if is_correct else 2
    if is_correct:
        if state.repetitions == 0:
            state.interval_days = SRS_FIRST_INTERVAL
        elif state.repetitions == 1:
            state.interval_days = SRS_SECOND_INTERVAL
        else:
            state.interval_days = max(1, round(state.interval_days * state.ease))
        state.repetitions += 1
    else:
        state.repetitions = 0
        state.interval_days = SRS_LAPSE_INTERVAL
    state.ease = max(1.3, state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    state.last_result = (
        SrsState.LastResult.CORRECT if is_correct else SrsState.LastResult.WRONG
    )
    state.due_at = timezone.now() + timedelta(days=state.interval_days)


@transaction.atomic
def grade_answer(user, question_token, choice_index, answer_ms=None):
    """답안 채점. 세트 토큰이면 set_id 생존 검증, 단발 토큰이면 TTL 검증."""
    # 서명 검증 (세트 토큰은 TTL 우회 — set_id 생존으로 대체)
    try:
        payload = signing.loads(question_token, salt=QUESTION_SALT, max_age=None)
    except signing.BadSignature as exc:
        raise InvalidQuestionToken('문제 토큰이 유효하지 않습니다.') from exc

    is_set_token = 'sid' in payload

    # 단발 토큰: 별도 TTL 재검증
    if not is_set_token:
        try:
            signing.loads(question_token, salt=QUESTION_SALT, max_age=QUESTION_TTL_SECONDS)
        except signing.SignatureExpired as exc:
            raise InvalidQuestionToken('문제 토큰이 만료되었습니다.') from exc

    item_type = payload['it']
    item_id = payload['id']
    question_type = payload['qt']
    is_correct = int(choice_index) == int(payload['ci'])

    token_hash = hashlib.sha256(question_token.encode()).hexdigest()
    # 세트 토큰은 quiz_set_item.answered 로 중복 방지 — token_hash 체크 생략
    # (signing.dumps 가 동일 payload → 동일 token 을 생성하므로 재직렬화 시 오탐 발생)
    if not is_set_token and QuizLog.objects.filter(token_hash=token_hash).exists():
        raise InvalidQuestionToken('이미 채점된 문제입니다.')

    # 세트 토큰: QuizSet/QuizSetItem 검증
    quiz_set = None
    quiz_set_item = None
    if is_set_token:
        quiz_set = QuizSet.objects.select_for_update().filter(
            id=payload['sid'], user=user,
        ).first()
        if not quiz_set:
            raise InvalidQuestionToken('세트가 존재하지 않습니다.')
        quiz_set_item = QuizSetItem.objects.select_for_update().filter(
            quiz_set=quiz_set, order=payload['ord'],
        ).first()
        if quiz_set_item and quiz_set_item.answered:
            raise InvalidQuestionToken('이미 채점된 문제입니다.')

    # SRS 갱신
    state, _ = SrsState.objects.select_for_update().get_or_create(
        user=user, item_type=item_type, item_id=item_id,
        defaults={'due_at': timezone.now()},
    )
    _apply_sm2(state, is_correct)
    state.save()

    # Daily
    from rewards.models import Daily
    today = timezone.localdate()
    Daily.objects.get_or_create(user=user, date=today)
    daily = Daily.objects.select_for_update().get(user=user, date=today)

    # 상자 지급
    box = None
    if is_correct:
        # 세트당 상한은 없앴다(2026-07-23). 세트는 며칠에 걸쳐 이어질 수 있어서
        # 세트에 상한을 걸면 오래된 세트를 재개했을 때 정답을 맞춰도 상자가 안 나왔다.
        # 상자 상한은 일일 기준 하나만 둔다.
        if daily.boxes_earned < MAX_BOXES_PER_DAY:
            box = CashBox.objects.create(
                user=user, grade=_roll_box_grade(), burst_count=_roll_burst_count(),
            )
            daily.boxes_earned += 1
            if quiz_set:
                quiz_set.boxes_earned += 1

    # QuizLog
    jlpt = _get_jlpt(item_type, item_id)
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

    # 정답 10개마다(당일 기준, 매일 0으로 리셋) 캐시 직접 지급 — 상자와 별개.
    milestone_hit = (
        is_correct
        and daily.correct_count % QUIZ_MILESTONE_INTERVAL == 0
        and daily.correct_count <= QUIZ_MILESTONE_MAX
    )
    if milestone_hit:
        from rewards.models import Ledger
        from rewards.services import earn
        earn(
            user, QUIZ_MILESTONE_BONUS, Ledger.Reason.QUIZ_MILESTONE,
            ref_type='daily', ref_id=daily.id,
        )

    # QuizSetItem / QuizSet 갱신
    set_completed = False
    if quiz_set_item:
        quiz_set_item.answered = True
        quiz_set_item.is_correct = is_correct
        quiz_set_item.save(update_fields=['answered', 'is_correct'])
        quiz_set.answered_count += 1
        if quiz_set.answered_count >= SET_SIZE:
            quiz_set.completed_at = timezone.now()
            set_completed = True
        quiz_set.save(update_fields=['answered_count', 'boxes_earned', 'completed_at'])

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
        'set_boxes_earned': quiz_set.boxes_earned if quiz_set else None,
        'set_completed': set_completed if quiz_set else None,
        'milestone_bonus': QUIZ_MILESTONE_BONUS if milestone_hit else None,
        'today_correct_count': daily.correct_count,
    }


# ── 오프라인 동기화 ──────────────────────────────────────────────────────────────

def sync_answers(user, answers):
    """오프라인 답안 배열을 SRS/통계만 갱신. 상자 절대 미지급."""
    from django.utils.dateparse import parse_datetime
    from rewards.models import Daily

    results = []
    for item in answers:
        try:
            payload = signing.loads(item['question_token'], salt=QUESTION_SALT, max_age=None)
        except signing.BadSignature:
            results.append({'status': 'invalid'})
            continue

        token_hash = hashlib.sha256(item['question_token'].encode()).hexdigest()
        if QuizLog.objects.filter(token_hash=token_hash).exists():
            results.append({'status': 'already_graded'})
            continue

        item_type = payload['it']
        item_id = payload['id']
        question_type = payload['qt']
        is_correct = int(item['choice_index']) == int(payload['ci'])

        quiz_set = None
        quiz_set_item = None
        if 'sid' in payload:
            quiz_set = QuizSet.objects.filter(id=payload['sid'], user=user).first()
            if not quiz_set:
                results.append({'status': 'invalid'})
                continue
            quiz_set_item = QuizSetItem.objects.filter(
                quiz_set=quiz_set, order=payload['ord'],
            ).first()

        try:
            with transaction.atomic():
                state, _ = SrsState.objects.select_for_update().get_or_create(
                    user=user, item_type=item_type, item_id=item_id,
                    defaults={'due_at': timezone.now()},
                )
                _apply_sm2(state, is_correct)
                state.save()

                today = timezone.localdate()
                Daily.objects.get_or_create(user=user, date=today)
                daily = Daily.objects.select_for_update().get(user=user, date=today)

                jlpt = _get_jlpt(item_type, item_id)
                QuizLog.objects.create(
                    user=user, mode=item_type, item_type=item_type, item_id=item_id,
                    question_type=question_type, is_correct=is_correct,
                    answer_ms=item.get('answer_ms'), jlpt_level=jlpt,
                    box=None, token_hash=token_hash,
                )
                daily.quiz_count += 1
                if is_correct:
                    daily.correct_count += 1
                daily.save(update_fields=['quiz_count', 'correct_count', 'updated_at'])

                if quiz_set_item and not quiz_set_item.answered:
                    quiz_set_item.answered = True
                    quiz_set_item.is_correct = is_correct
                    quiz_set_item.save(update_fields=['answered', 'is_correct'])
                    QuizSet.objects.filter(id=quiz_set.id).update(
                        answered_count=F('answered_count') + 1,
                    )
                    quiz_set.refresh_from_db(fields=['answered_count'])
                    if quiz_set.answered_count >= SET_SIZE and not quiz_set.completed_at:
                        answered_at_str = item.get('answered_at')
                        completed_at = timezone.now()
                        if answered_at_str:
                            parsed = parse_datetime(answered_at_str)
                            if parsed:
                                completed_at = parsed
                        QuizSet.objects.filter(
                            id=quiz_set.id, completed_at__isnull=True,
                        ).update(completed_at=completed_at)

        except IntegrityError:
            results.append({'status': 'already_graded'})
            continue

        results.append({'status': 'ok', 'is_correct': is_correct})

    return results


# ── 북마크 ────────────────────────────────────────────────────────────────────────

def toggle_bookmark(user, item_type, item_id):
    """북마크 추가(없으면) / 제거(있으면). (is_bookmarked, created) 반환."""
    obj, created = Bookmark.objects.get_or_create(
        user=user, item_type=item_type, item_id=item_id,
    )
    if not created:
        obj.delete()
    return created


def get_bookmark_ids(user):
    """유저의 북마크 (item_type, item_id) 집합."""
    return set(
        Bookmark.objects.filter(user=user).values_list('item_type', 'item_id'),
    )


def get_bookmarks_with_detail(user):
    """유저의 북마크 목록 + 콘텐츠 상세 반환."""
    bookmarks = Bookmark.objects.filter(user=user).order_by('-created_at')

    kanji_ids = [b.item_id for b in bookmarks if b.item_type == ItemType.KANJI]
    word_ids  = [b.item_id for b in bookmarks if b.item_type == ItemType.WORD]
    kana_ids  = [b.item_id for b in bookmarks if b.item_type == ItemType.KANA]

    kanji_map = {k.id: k for k in Kanji.objects.filter(id__in=kanji_ids)}
    word_map  = {w.id: w for w in Word.objects.filter(id__in=word_ids).prefetch_related('meanings')}
    kana_map  = {k.id: k for k in Kana.objects.filter(id__in=kana_ids)}

    result = []
    for b in bookmarks:
        if b.item_type == ItemType.KANJI:
            obj = kanji_map.get(b.item_id)
            if not obj:
                continue
            result.append({
                'item_type': b.item_type,
                'item_id': b.item_id,
                'surface': obj.character,
                'reading': obj.on_reading or obj.kun_reading,
                'meaning': obj.meaning_ko,
                'jlpt_level': obj.jlpt_level or '',
            })
        elif b.item_type == ItemType.WORD:
            obj = word_map.get(b.item_id)
            if not obj:
                continue
            first_meaning = obj.meanings.order_by('sense_no').first()
            result.append({
                'item_type': b.item_type,
                'item_id': b.item_id,
                'surface': obj.surface,
                'reading': obj.reading,
                'meaning': first_meaning.meaning_ko if first_meaning else '',
                'jlpt_level': obj.jlpt_level or '',
            })
        elif b.item_type == ItemType.KANA:
            obj = kana_map.get(b.item_id)
            if not obj:
                continue
            result.append({
                'item_type': b.item_type,
                'item_id': b.item_id,
                'surface': obj.character,
                'reading': obj.romaji,
                'meaning': '',
                'jlpt_level': '',
            })
    return result
