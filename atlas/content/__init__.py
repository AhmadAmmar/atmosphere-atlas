"""Collects chapters, topics, glossary, tours and reference tables, and validates them."""
from __future__ import annotations

import importlib
import random
import re

from .model import Chapter, Term, Topic, to_json
from .autolink import autolink
from .storm_notes import STORM_NOTES
from .p3_data import P3_DATA

TOPIC_MODULES = [
    "topics_sun", "topics_air", "topics_wind", "topics_circulation", "topics_ocean", "topics_weather", "topics_weather2",
    "topics_storms", "topics_modes", "topics_water", "topics_climate", "topics_climate2", "topics_sky", "topics_observe",
    "topics_practical",
]

LEVEL_FIELDS = ("simple", "detail", "expert")


def _load():
    """Chapters, topics, glossary terms, tours and reference text from the content modules."""
    from . import chapters, glossary, reference, tours
    topics: list[Topic] = []
    for name in TOPIC_MODULES:
        try:
            mod = importlib.import_module(f"{__name__}.{name}")
        except ModuleNotFoundError as exc:
            if exc.name == f"{__name__}.{name}":
                continue
            raise
        topics.extend(mod.TOPICS)
    return chapters.CHAPTERS, topics, glossary.TERMS, tours.TOURS, reference


_LINK = re.compile(r"\{\{([^|}]+)(?:\|[^}]*)?\}\}")
_TERM = re.compile(r"\[\[([^|\]]+)(?:\|[^\]]*)?\]\]")


def _all_text(topic: Topic) -> list[str]:
    """Every text field of a topic (title, kicker, simple, detail and expert text, facts and myths)."""
    texts = [topic.title, topic.kicker, *topic.simple]
    for block in (topic.detail, topic.expert):
        texts.extend(t for pair in block for t in pair)
    texts.extend(f"{a} {b}" for a, b in topic.facts)
    texts.extend(f"{a} {b}" for a, b in topic.myths)
    texts.extend(topic.try_it)
    for q in topic.quiz:
        texts.extend([q["q"], q["why"], *q["options"]])
    return texts


def shuffle_quiz(topic: Topic) -> None:
    """Move the right answer around (the same way on every build) so that it is not always the first option."""
    for n, q in enumerate(topic.quiz):
        rng = random.Random(f"{topic.id}:{n}:{q['q']}")
        order = list(range(len(q["options"])))
        rng.shuffle(order)
        right = q["options"][q["answer"]]
        q["options"] = [q["options"][i] for i in order]
        q["answer"] = q["options"].index(right)


def validate(chapters, topics, terms, tours) -> None:
    """Check the content: unique topic ids, known chapters, terms and tour stops; raises with all errors."""
    errors = []
    chapter_ids = {c.id for c in chapters}
    topic_ids = [t.id for t in topics]
    if len(set(topic_ids)) != len(topic_ids):
        dup = sorted({i for i in topic_ids if topic_ids.count(i) > 1})
        errors.append(f"duplicate topic ids: {dup}")
    ids = set(topic_ids)
    known_terms = set()
    for t in terms:
        known_terms.add(t.key.lower())
        known_terms.update(a.lower() for a in t.aliases)
    for t in topics:
        if t.chapter not in chapter_ids:
            errors.append(f"{t.id}: unknown chapter {t.chapter}")
        if not t.simple or any(not p.strip() for p in t.simple):
            errors.append(f"{t.id}: needs plain-language text")
        for ref in t.see:
            if ref not in ids:
                errors.append(f"{t.id}: 'see also' points to missing topic {ref}")
        for text in _all_text(t):
            for m in _LINK.finditer(text):
                if m.group(1).strip() not in ids:
                    errors.append(f"{t.id}: link to missing topic {m.group(1)}")
            for m in _TERM.finditer(text):
                if m.group(1).strip().lower() not in known_terms:
                    errors.append(f"{t.id}: glossary term not defined: {m.group(1)}")
        for q in t.quiz:
            if not (0 <= q["answer"] < len(q["options"])):
                errors.append(f"{t.id}: quiz answer out of range")
    for tour in tours:
        for step in tour["steps"]:
            if step not in ids:
                errors.append(f"tour {tour['id']}: missing topic {step}")
    if errors:
        raise ValueError("content validation failed:\n  " + "\n  ".join(errors[:60]))


def build_content(*, series: dict, tables: dict, manifest: dict) -> dict:
    """The content as JSON-ready data, with figures filled from the series, tables and manifest."""
    chapters, topics, terms, tours, reference = _load()
    topics = [t for t in topics]
    for t in topics:                                   # allow topic text to quote live numbers
        reference.fill(t, series=series, tables=tables, manifest=manifest)
    for t in topics:
        autolink(t, terms)
        shuffle_quiz(t)
    validate(chapters, topics, terms, tours)
    order = {c.id: i for i, c in enumerate(chapters)}
    topics.sort(key=lambda t: order[t.chapter])        # stable: keeps authoring order within a chapter
    glossary = []
    for term in sorted(terms, key=lambda t: t.key.lower()):
        glossary.append({"key": term.key, "def": term.definition, "aliases": term.aliases})
    return {
        "chapters": [to_json(c) for c in chapters],
        "topics": [to_json(t) for t in topics],
        "glossary": glossary,
        "tours": tours,
        "records": reference.RECORDS,
        "pressureCentres": reference.PRESSURE_CENTRES,
        "namedWinds": reference.NAMED_WINDS,
        "currents": reference.CURRENTS,
        "conveyor": reference.CONVEYOR,
        "conveyorSites": reference.CONVEYOR_SITES,
        "rivers": reference.RIVERS,
        "lightning": reference.LIGHTNING_HOTSPOTS,
        "basins": reference.BASINS,
        "stormNotes": STORM_NOTES,
        "p3": P3_DATA,
        "climateStats": reference.climate_stats(series),
    }
