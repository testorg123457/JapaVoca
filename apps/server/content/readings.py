"""발음 문자열 파싱 — 시드 데이터 포맷을 아는 유일한 곳.

시드 포맷 (예: 食의 훈독)
    く（う）・た（べる）・く（らう）・*は（む）

    ・(U+30FB)  발음 구분자
    （）        오쿠리가나 — 한자 몫이 아닌 딸린 히라가나
    *           표외음훈(상용 외 읽기) 마커

표시용과 재생용이 다르다. 화면에는 어디까지가 한자 몫인지 보여야 하니 괄호를
남기고, TTS에는 괄호를 떼고 붙여 실제 단어(た（べる） → たべる)를 넘긴다.

⚠️ 이 규칙을 클라이언트에 두지 않는다. 예전엔 서버가 ' · '(U+00B7)로 합치고
클라이언트가 '・'(U+30FB)로 쪼개서, 복수 발음이 한 번도 갈라지지 않았다.
"""
SEPARATOR = '・'
RARE_MARKER = '*'
OKURIGANA_OPEN = '（'
OKURIGANA_STRIP = str.maketrans('', '', '（）')

DEFAULT_LIMIT = 3


def _stem(display: str) -> str:
    """'た（べる）' → 'た'. 괄호 앞이 한자가 실제로 맡는 소리다."""
    return display.split(OKURIGANA_OPEN)[0]


def parse_readings(raw: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """'たか・たか（い）・*たか（める）' → [{'display','speak'}, …]

    표외음훈을 거르고, 어간이 다른 발음을 먼저 채운 뒤 limit개까지 자른다.

    순서가 세 번 중요하다.
      1) *를 먼저 거른다 — 안 그러면 앞이 전부 *인 한자에서 멀쩡한 발음이 날아간다.
      2) 어간이 다른 것을 앞으로 당긴다 — 空(あ（く）・あ（ける）・から・そら)에서
         같은 어간 あ가 두 칸을 먹으면 정작 흔한 そら가 잘린다.
      3) 자르는 건 맨 마지막. 그래서 조기 break를 못 한다.
    """
    if not raw:
        return []

    parsed = []
    for part in raw.split(SEPARATOR):
        part = part.strip()
        if not part or part.startswith(RARE_MARKER):
            continue
        parsed.append({
            'display': part,
            'speak': part.translate(OKURIGANA_STRIP),
        })

    # 처음 보는 어간 / 이미 나온 어간의 활용형. 각 그룹 안에서는 원문 순서를 지켜서
    # 첫 발음이 1번 자리를 잃지 않게 한다.
    fresh, variants, seen = [], [], set()
    for reading in parsed:
        stem = _stem(reading['display'])
        (variants if stem in seen else fresh).append(reading)
        seen.add(stem)

    return (fresh + variants)[:limit]


def kanji_readings(kanji, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """한자의 대표 발음. 훈독 우선, 없으면 음독.

    훈독이 비어 있거나(53자) 전부 표외음훈이면(760자 — 王·気·校처럼 상용
    훈독이 없는 한자) 음독으로 넘어간다. 音/訓 라벨은 붙이지 않는다.
    """
    return (
        parse_readings(kanji.kun_reading, limit)
        or parse_readings(kanji.on_reading, limit)
    )


def display_line(readings: list[dict]) -> str:
    """발음 목록 → 화면 한 줄."""
    return ' · '.join(r['display'] for r in readings)
