"""Data model for the educational content.

Text fields use a tiny mark-up that the page renders safely (never as HTML):

    **bold**   *italic*   ^{superscript}   _{subscript}
    [[glossary term]]  or  [[term|shown text]]     hover definition
    {{topic-id|link text}}                         link to another topic
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass
class Chapter:
    id: str
    title: str
    blurb: str
    icon: str                      # key of an icon drawn by the page


@dataclass
class Term:
    key: str                       # canonical name shown in the glossary
    definition: str
    aliases: list = field(default_factory=list)


@dataclass
class Topic:
    id: str
    chapter: str
    title: str
    kicker: str                    # one sentence that says what the topic is
    simple: list                   # plain-language paragraphs, no jargon, analogies welcome
    detail: list = field(default_factory=list)      # [(heading, text)] the mechanism, step by step
    expert: list = field(default_factory=list)      # [(heading, text)] equations and numbers; "EQ: ..." lines render as equations
    facts: list = field(default_factory=list)       # [(value, label)] headline numbers
    myths: list = field(default_factory=list)       # [(myth, reality)]
    try_it: list = field(default_factory=list)      # things to do with the model
    see: list = field(default_factory=list)         # ids of related topics
    scene: dict = field(default_factory=dict)       # how the globe should look
    charts: list = field(default_factory=list)      # chart specs {id: ..., ...}
    widget: str = ""                                # interactive scene controller id
    quiz: list = field(default_factory=list)        # [{q, options, answer, why}]
    sources: list = field(default_factory=list)
    tags: list = field(default_factory=list)


def to_json(obj):
    d = asdict(obj)
    return d
