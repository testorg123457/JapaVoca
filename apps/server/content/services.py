"""content 서비스 — 한자 구성자 트리 조회."""
import re

from .models import Kanji


def _parse_component_chars(components_str: str) -> list[str]:
    """'言(말씀 언) + 吾(나 오)' → ['言', '吾']"""
    result = []
    for part in components_str.split('+'):
        m = re.match(r'^(.+?)\(', part.strip())
        if m:
            result.append(m.group(1).strip())
    return result


def _walk(char: str, visited: set, nodes: dict, depth: int) -> None:
    if char in visited or depth > 4:
        return
    visited.add(char)

    kanji = Kanji.objects.filter(character=char).first()
    if not kanji:
        return  # DB에 없는 이형자 — 말단으로 처리

    raw_children = _parse_component_chars(kanji.components) if kanji.components else []
    # 자기 자신 참조 제거
    children = [c for c in raw_children if c != char]

    nodes[char] = {
        'character': char,
        'meaning_ko': kanji.meaning_ko,
        'on_reading': kanji.on_reading,
        'kun_reading': kanji.kun_reading,
        'components': children,
        'is_leaf': len(children) == 0,
    }

    for child in children:
        _walk(child, visited, nodes, depth + 1)


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
