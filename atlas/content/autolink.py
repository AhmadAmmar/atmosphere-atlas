"""Turns the first mention of each glossary term in a topic into a hover link, so every reader can look a word up."""
from __future__ import annotations

import re

from .model import Topic

# Words that mean something else in everyday speech are never linked automatically.
NO_AUTOLINK = {"eye", "lee", "front", "ridge", "trough", "weather", "climate", "kelvin", "pressure", "eddy", "zonal", "forcing",
               "shear", "latitude", "longitude", "convection", "stability", "inversion", "gyre", "tornado", "depression",
               "high", "low", "jet", "block", "omega", "easterly", "westerly", "cyclonic", "chaotic", "upwell", "squall"}
MAX_AUTOLINKS = 10

_TERM = re.compile(r"\[\[([^|\]]+)(?:\|[^\]]*)?\]\]")
# mark-up that must stay untouched: existing links, bold and italics, super and subscripts, equation lines
_PROTECTED = re.compile(r"\[\[.*?\]\]|\{\{.*?\}\}|\*\*.*?\*\*|\*[^*\n]+\*|\^\{.*?\}|_\{.*?\}|^EQ:.*$", re.M)


def _texts(topic: Topic) -> list[str]:
    out = [topic.title, topic.kicker, *topic.simple]
    for block in (topic.detail, topic.expert):
        out.extend(t for pair in block for t in pair)
    return out


def autolink(topic: Topic, terms) -> None:
    patterns = []
    for term in terms:
        for name in [term.key, *term.aliases]:
            if len(name) < 4 or name.lower() in NO_AUTOLINK or name.lower() in topic.title.lower():
                continue
            patterns.append((term.key, name, re.compile(rf"(?<![\w\-]){re.escape(name)}(?![\w\-])", re.I)))
    patterns.sort(key=lambda p: -len(p[1]))
    used = {m.group(1).strip().lower() for text in _texts(topic) for m in _TERM.finditer(text)}
    count = len(used)

    def link_text(text: str) -> str:
        nonlocal count
        if count >= MAX_AUTOLINKS:
            return text
        pieces, pos = [], 0
        for m in _PROTECTED.finditer(text):
            pieces.append((text[pos:m.start()], False))
            pieces.append((m.group(0), True))
            pos = m.end()
        pieces.append((text[pos:], False))
        out = []
        for chunk, protected in pieces:
            if not protected:
                taken = []                                   # (start, end, key, matched text) chosen in this chunk
                for key, name, rx in patterns:
                    if count >= MAX_AUTOLINKS:
                        break
                    if key.lower() in used:
                        continue
                    for m in rx.finditer(chunk):
                        if all(m.end() <= a or m.start() >= b for a, b, _, _ in taken):
                            taken.append((m.start(), m.end(), key, m.group(0)))
                            used.add(key.lower())
                            count += 1
                            break
                for a, b, key, shown in sorted(taken, reverse=True):
                    chunk = chunk[:a] + f"[[{key}|{shown}]]" + chunk[b:]
            out.append(chunk)
        return "".join(out)

    topic.simple = [link_text(p) for p in topic.simple]
    topic.detail = [(head, link_text(body)) for head, body in topic.detail]
