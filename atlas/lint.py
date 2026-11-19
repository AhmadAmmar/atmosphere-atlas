"""Quality gate for the generated page.

The build refuses to write a page that still contains unfinished-text markers, stray
tool or author signatures, or broken internal references.  Forbidden strings are assembled from
fragments so that this file does not itself contain the words it rejects.
"""
from __future__ import annotations

import re

_FRAGMENTS = {
    "unfinished": [
        ["lor", "em ip", "sum"], ["TO", "DO"], ["FIX", "ME"], ["T", "B", "D"], ["coming ", "soon"], ["to be ", "written"],
        ["insert ", "here"], ["dum", "my text"], ["place", "holder text"], ["sam", "ple text"], ["xx", "xx"],
    ],
    "signature": [
        ["as an ", "A", "I"], ["lang", "uage mo", "del"], ["gener", "ated by"], ["chat", "gpt"], ["open", "ai"],
        ["anthro", "pic"], ["cla", "ude"], ["large lang", "uage"], ["written by a", "n assistant"], ["L", "L", "M"],
    ],
}


def _compile(group: str) -> list[re.Pattern]:
    """Whole-word patterns of a group of words to flag (case-sensitive for acronyms)."""
    out = []
    for parts in _FRAGMENTS[group]:
        word = "".join(parts)
        flags = 0 if word.isupper() else re.IGNORECASE
        out.append(re.compile(r"(?<![A-Za-z])" + re.escape(word) + r"(?![A-Za-z])", flags))
    return out


UNFINISHED = _compile("unfinished")
SIGNATURE = _compile("signature")


def scan(text: str, label: str) -> list[str]:
    """Return a list of human-readable problems found in ``text``."""
    problems = []
    for group, patterns in (("unfinished text", UNFINISHED), ("tool or author signature", SIGNATURE)):
        for pat in patterns:
            for m in pat.finditer(text):
                start = max(0, m.start() - 40)
                snippet = text[start:m.end() + 40].replace("\n", " ")
                problems.append(f"{label}: {group} '{m.group(0)}' ... {snippet}")
                if len(problems) > 40:
                    return problems
    return problems
