"""content 서비스 — 한자 구성자 트리 조회."""
import re

from .models import Kanji


def _parse_component_pairs(components_str: str) -> list[tuple[str, str]]:
    """'言(말씀 언) + 吾(나 오)' → [('言', '말씀 언'), ('吾', '나 오')]"""
    result = []
    for part in components_str.split('+'):
        part = part.strip()
        m = re.match(r'^(.+?)\((.+?)\)', part)
        if m:
            result.append((m.group(1).strip(), m.group(2).strip()))
    return result


def _walk(char: str, visited: set, nodes: dict, depth: int, fallback_meaning: str = '') -> None:
    if char in visited or depth > 4:
        return
    visited.add(char)

    kanji = Kanji.objects.filter(character=char).first()
    if not kanji:
        nodes[char] = {
            'character': char,
            'meaning_ko': fallback_meaning,
            'on_reading': '',
            'kun_reading': '',
            'components': [],
            'is_leaf': True,
        }
        return

    pairs = _parse_component_pairs(kanji.components) if kanji.components else []
    # 자기 자신 참조 제거
    pairs = [(c, m) for c, m in pairs if c != char]
    children = [c for c, _ in pairs]

    nodes[char] = {
        'character': char,
        'meaning_ko': kanji.meaning_ko,
        'on_reading': kanji.on_reading,
        'kun_reading': kanji.kun_reading,
        'components': children,
        'is_leaf': len(children) == 0,
    }

    for child_char, child_meaning in pairs:
        _walk(child_char, visited, nodes, depth + 1, fallback_meaning=child_meaning)


def build_component_tree(character: str) -> dict:
    """한자 한 글자를 받아 구성자 트리를 재귀 조회 후 반환."""
    visited: set = set()
    nodes: dict = {}
    _walk(character, visited, nodes, depth=0)

    root = nodes.get(character)
    return {
        'character': character,
        'nodes': nodes,
        'root_components': root['components'] if root else [],
    }
