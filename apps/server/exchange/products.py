"""교환 상품 카탈로그 — DB 대신 코드 상수로 관리(소수 고정 상품).

환율과 상품 원가만 바꾸면 가격이 갱신되도록, 상품은 원화가로 정의하고
price_cash 는 CASH_PER_KRW 로 환산한다.

⚠️ 환율 기준: 1만원권 = 22,300 캐시 기준 → 1원 = 2.23 캐시.
   (price_krw 는 실제 발급사 연동에 쓰는 원화가라 유지하고, 캐시 표시가만 이 환율로 환산.
    price_cash 는 정수로 반올림해 내려보낸다.)
"""
CASH_PER_KRW = 2.23

# (code, name, 원화가, provider)
_PRODUCTS = [
    {'code': 'COFFEE_5000', 'name': '아메리카노 1잔', 'price_krw': 5000, 'provider': 'mock'},
    {'code': 'CVS_5000', 'name': '편의점 5천원권', 'price_krw': 5000, 'provider': 'mock'},
    {'code': 'CVS_10000', 'name': '편의점 1만원권', 'price_krw': 10000, 'provider': 'mock'},
]


def _to_public(product: dict) -> dict:
    return {
        'code': product['code'],
        'name': product['name'],
        'price_cash': round(product['price_krw'] * CASH_PER_KRW),
        'provider': product['provider'],
    }


def list_products() -> list[dict]:
    """공개 상품 목록(price_cash 환산 포함)."""
    return [_to_public(p) for p in _PRODUCTS]


def get_product(code: str) -> dict | None:
    """code 로 단일 상품 조회. 없으면 None."""
    for p in _PRODUCTS:
        if p['code'] == code:
            return _to_public(p)
    return None
