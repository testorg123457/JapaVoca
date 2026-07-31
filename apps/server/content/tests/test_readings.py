"""발음 문자열 파싱 — content.readings.

시드 데이터 포맷: 'たか・たか（い）・*たか（める）'
  ・(U+30FB)  구분자
  （）        오쿠리가나(딸린 히라가나)
  *           표외음훈 마커
"""
from django.test import TestCase

from content.models import Kanji
from content.readings import kanji_readings, parse_readings


class ParseReadingsTest(TestCase):
    def test_단일_발음(self):
        self.assertEqual(
            parse_readings('みち'),
            [{'display': 'みち', 'speak': 'みち'}],
        )

    def test_구분자로_쪼갠다(self):
        self.assertEqual(
            [r['display'] for r in parse_readings('うお・さかな')],
            ['うお', 'さかな'],
        )

    def test_오쿠리가나_괄호는_표시엔_남고_재생엔_붙는다(self):
        (r,) = parse_readings('た（べる）')
        self.assertEqual(r['display'], 'た（べる）')
        self.assertEqual(r['speak'], 'たべる')

    def test_표외음훈은_버린다(self):
        # 道 = みち・*い（う）・*みちび（く）
        self.assertEqual(
            [r['display'] for r in parse_readings('みち・*い（う）・*みちび（く）')],
            ['みち'],
        )

    def test_전부_표외음훈이면_빈_목록(self):
        # 王처럼 상용 훈독이 없는 한자(760자)
        self.assertEqual(parse_readings('*きみ'), [])

    def test_상한은_기본_3개(self):
        # 高 = たか・たか（い）・たか（まる）・たか（める）
        readings = parse_readings('たか・たか（い）・たか（まる）・たか（める）')
        self.assertEqual(len(readings), 3)
        self.assertEqual(readings[-1]['speak'], 'たかまる')

    def test_상한은_조절_가능(self):
        self.assertEqual(len(parse_readings('あ・い・う・え', limit=2)), 2)

    def test_빈_입력(self):
        self.assertEqual(parse_readings(''), [])
        self.assertEqual(parse_readings('   '), [])

    def test_빈_조각과_공백은_흘린다(self):
        self.assertEqual(
            [r['display'] for r in parse_readings(' みち ・・ さかな ')],
            ['みち', 'さかな'],
        )

    def test_상한은_표외음훈을_거른_뒤에_적용된다(self):
        # *를 먼저 세면 남는 게 1개뿐이라 뒤의 멀쩡한 발음이 잘린다
        readings = parse_readings('*あ・*い・う・え')
        self.assertEqual([r['display'] for r in readings], ['う', 'え'])


class StemOrderTest(TestCase):
    """어간(괄호 앞)이 다른 발음을 먼저 채우고, 남는 칸을 활용형으로 메운다.

    앞에서 그냥 자르면 같은 어간의 활용형이 자리를 다 먹어서
    정작 다른 소리(空의 そら)가 밀려난다.
    """

    def test_다른_어간이_같은_어간의_활용형보다_먼저(self):
        # 空 — あ（く）·あ（ける）가 두 칸을 먹으면 そら가 잘린다
        readings = parse_readings(
            'あ（く）・あ（ける）・から・そら・*あな・*うつ（ける）・*す（く）',
        )
        self.assertEqual(
            [r['display'] for r in readings],
            ['あ（く）', 'から', 'そら'],
        )

    def test_첫_발음은_자리를_지킨다(self):
        # 순서를 바꾸더라도 1번은 원문 첫 항목이어야 한다
        for raw in [
            'あ（く）・あ（ける）・から・そら',
            'ただ（しい）・ただ（す）・まさ',
            'い（かす）・い（きる）・い（ける）・う（まれる）・なま',
        ]:
            first = [p for p in raw.split('・') if not p.startswith('*')][0]
            self.assertEqual(parse_readings(raw)[0]['display'], first, raw)

    def test_어간이_하나뿐이면_원래_순서_그대로(self):
        # 高 — 전부 たか라 정렬해도 달라질 게 없다
        self.assertEqual(
            [r['display'] for r in parse_readings('たか・たか（い）・たか（まる）・たか（める）')],
            ['たか', 'たか（い）', 'たか（まる）'],
        )

    def test_남는_칸은_활용형으로_채운다(self):
        # 食 — 어간이 く·た 둘뿐이라 세 번째 칸은 く（らう）가 가져간다
        self.assertEqual(
            [r['display'] for r in parse_readings('く（う）・た（べる）・く（らう）・*は（む）')],
            ['く（う）', 'た（べる）', 'く（らう）'],
        )

    def test_괄호가_없으면_정렬이_무동작(self):
        # 음독은 괄호가 없어 항목마다 어간이 달라 원래 순서가 유지된다
        self.assertEqual(
            [r['display'] for r in parse_readings('ショク・ジキ・イ・シ')],
            ['ショク', 'ジキ', 'イ'],
        )


class KanjiReadingsTest(TestCase):
    def test_훈독이_있으면_훈독(self):
        kanji = Kanji.objects.create(
            character='魚', meaning_ko='물고기 어',
            on_reading='ギョ', kun_reading='うお・さかな',
        )
        self.assertEqual(
            [r['speak'] for r in kanji_readings(kanji)],
            ['うお', 'さかな'],
        )

    def test_훈독이_비면_음독으로_폴백(self):
        # kun 없고 on만 있는 53자
        kanji = Kanji.objects.create(
            character='丁', meaning_ko='고무래 정',
            on_reading='チョウ・テイ', kun_reading='',
        )
        self.assertEqual(
            [r['speak'] for r in kanji_readings(kanji)],
            ['チョウ', 'テイ'],
        )

    def test_훈독이_전부_표외음훈이면_음독으로_폴백(self):
        # 王 — 상용 훈독이 없는 760자. 필터 결과가 비면 폴백이 걸려야 한다.
        kanji = Kanji.objects.create(
            character='王', meaning_ko='임금 왕',
            on_reading='オウ', kun_reading='*きみ',
        )
        self.assertEqual([r['speak'] for r in kanji_readings(kanji)], ['オウ'])

    def test_둘_다_없으면_빈_목록(self):
        kanji = Kanji.objects.create(
            character='丶', meaning_ko='점 주', on_reading='', kun_reading='',
        )
        self.assertEqual(kanji_readings(kanji), [])


class SeedDataSweepTest(TestCase):
    """실 시드 데이터 전수 검사 — 포맷이 바뀌면 여기서 잡힌다.

    테스트 DB는 비어 있을 수 있으므로(--keepdb) 데이터가 없으면 건너뛴다.
    """

    def test_파싱_결과에_마커나_괄호가_남지_않는다(self):
        rows = list(Kanji.objects.exclude(kun_reading='').values_list(
            'character', 'kun_reading', 'on_reading',
        )[:500])
        if not rows:
            self.skipTest('시드 데이터 없음')
        for character, kun, on in rows:
            for source in (kun, on):
                for r in parse_readings(source):
                    self.assertNotIn('*', r['speak'], f'{character}: {source}')
                    self.assertNotIn('（', r['speak'], f'{character}: {source}')
                    self.assertNotIn('）', r['speak'], f'{character}: {source}')
                    self.assertNotIn('・', r['speak'], f'{character}: {source}')
                    self.assertNotIn('*', r['display'], f'{character}: {source}')
                    self.assertTrue(r['speak'], f'{character}: 빈 speak')
