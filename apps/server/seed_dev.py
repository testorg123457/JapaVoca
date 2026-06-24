"""개발용 최소 시드 — 퀴즈(단어/한자) 동작 확인용 N5 기초 데이터.

실행: python manage.py shell < seed_dev.py
멱등: surface/character 기준 get_or_create 라 여러 번 돌려도 중복 안 생김.
운영 데이터 아님 — 화면/플로우 확인용.
"""
from content.models import Kanji, Word, WordMeaning

WORDS = [
    # (surface, reading, pos, [뜻...])
    ('水', 'みず', '명사', ['물']),
    ('火', 'ひ', '명사', ['불']),
    ('山', 'やま', '명사', ['산']),
    ('川', 'かわ', '명사', ['강', '하천']),
    ('人', 'ひと', '명사', ['사람']),
    ('日', 'ひ', '명사', ['날', '해']),
    ('木', 'き', '명사', ['나무']),
    ('本', 'ほん', '명사', ['책']),
    ('食べる', 'たべる', '동사', ['먹다']),
    ('飲む', 'のむ', '동사', ['마시다']),
    ('見る', 'みる', '동사', ['보다']),
    ('行く', 'いく', '동사', ['가다']),
    ('大きい', 'おおきい', '형용사', ['크다']),
    ('小さい', 'ちいさい', '형용사', ['작다']),
    ('新しい', 'あたらしい', '형용사', ['새롭다']),
]

KANJI = [
    # (character, meaning_ko, on, kun, stroke)
    ('一', '한 일', 'イチ', 'ひと', 1),
    ('二', '두 이', 'ニ', 'ふた', 2),
    ('三', '석 삼', 'サン', 'みっ', 3),
    ('日', '날 일', 'ニチ', 'ひ', 4),
    ('月', '달 월', 'ゲツ', 'つき', 4),
    ('火', '불 화', 'カ', 'ひ', 4),
    ('水', '물 수', 'スイ', 'みず', 4),
    ('木', '나무 목', 'モク', 'き', 4),
    ('金', '쇠 금', 'キン', 'かね', 8),
    ('土', '흙 토', 'ド', 'つち', 3),
    ('山', '메 산', 'サン', 'やま', 3),
    ('川', '내 천', 'セン', 'かわ', 3),
    ('人', '사람 인', 'ジン', 'ひと', 2),
    ('大', '큰 대', 'ダイ', 'おお', 3),
    ('小', '작을 소', 'ショウ', 'ちい', 3),
]

w_new = 0
for surface, reading, pos, meanings in WORDS:
    wtype = Word.WordType.KANJI
    word, created = Word.objects.get_or_create(
        surface=surface,
        defaults={'word_type': wtype, 'reading': reading, 'pos': pos, 'jlpt_level': 'N5'},
    )
    if created:
        w_new += 1
    for i, m in enumerate(meanings, start=1):
        WordMeaning.objects.get_or_create(
            word=word, sense_no=i, defaults={'meaning_ko': m},
        )

k_new = 0
for ch, mko, on, kun, stroke in KANJI:
    _, created = Kanji.objects.get_or_create(
        character=ch,
        defaults={
            'meaning_ko': mko, 'on_reading': on, 'kun_reading': kun,
            'stroke_count': stroke, 'jlpt_level': 'N5',
        },
    )
    if created:
        k_new += 1

print(f'words: +{w_new} (total {Word.objects.count()}), '
      f'kanji: +{k_new} (total {Kanji.objects.count()}), '
      f'meanings total {WordMeaning.objects.count()}')
