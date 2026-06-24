"""AdMob SSV(서버 보상 검증) 서명 검증.

AdMob 보상형 광고 콜백의 signature(ECDSA/secp256r1, SHA-256)를 Google 공개키로
검증한다. 공개키는 verifier-keys.json 에서 key_id 로 조회하고 1시간 인메모리 캐시.

검증 대상(message)은 콜백 쿼리스트링에서 **signature 와 key_id 앞부분**이다(AdMob
스펙: 이 둘은 항상 마지막 두 파라미터). raw 쿼리스트링을 그대로 써야 하므로
parse 후 재인코딩하지 않는다.

⚠️ settings.ADMOB_SSV_VERIFY=False(dev) 면 이 모듈을 호출하지 않고 통과로 본다.
"""
import base64
import time

import requests
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import load_pem_public_key

VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json'
_CACHE_TTL_SECONDS = 3600

_key_cache: dict = {'keys': {}, 'fetched_at': 0.0}


class SsvError(Exception):
    """SSV 검증 처리 오류(키 조회 실패 등)."""


def _get_public_keys() -> dict:
    """{key_id(str): pem(str)} 반환. 1시간 캐시."""
    now = time.time()
    if _key_cache['keys'] and now - _key_cache['fetched_at'] < _CACHE_TTL_SECONDS:
        return _key_cache['keys']
    try:
        response = requests.get(VERIFIER_KEYS_URL, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise SsvError(f'공개키 조회 실패: {exc}') from exc

    keys = {str(k['keyId']): k['pem'] for k in data.get('keys', [])}
    _key_cache['keys'] = keys
    _key_cache['fetched_at'] = now
    return keys


def verify_ssv(raw_query_string: str) -> bool:
    """AdMob SSV 콜백 raw 쿼리스트링의 서명을 검증한다. 통과 시 True."""
    # message = signature 직전까지의 raw 쿼리스트링.
    idx = raw_query_string.rfind('&signature=')
    if idx == -1:
        return False
    message = raw_query_string[:idx].encode('utf-8')

    # signature / key_id 추출(message 뒤쪽 raw 파싱).
    tail = raw_query_string[idx + 1:]  # 'signature=...&key_id=...'
    params = dict(p.split('=', 1) for p in tail.split('&') if '=' in p)
    signature_b64 = params.get('signature')
    key_id = params.get('key_id')
    if not signature_b64 or not key_id:
        return False

    # base64url(패딩 보정) → DER 서명.
    padded = signature_b64 + '=' * (-len(signature_b64) % 4)
    try:
        signature = base64.urlsafe_b64decode(padded)
    except (ValueError, base64.binascii.Error):
        return False

    keys = _get_public_keys()
    pem = keys.get(str(key_id))
    if not pem:
        return False

    try:
        public_key = load_pem_public_key(pem.encode('utf-8'))
        public_key.verify(signature, message, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError):
        return False
