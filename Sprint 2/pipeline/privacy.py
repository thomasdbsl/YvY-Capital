from __future__ import annotations

import re
from pathlib import Path


PRIVATE_PATTERNS = {
    "private_test_identifier": re.compile(r"\bPRIVATE_ID_[A-Z0-9_]+\b", re.IGNORECASE),
    "cnpj_like": re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b"),
    "isin_like": re.compile(r"\b[A-Z]{2}[A-Z0-9]{9}\d\b"),
}


def scan_text(text: str, denylist: list[str] | None = None) -> list[dict[str, str]]:
    hits: list[dict[str, str]] = []
    folded = text.casefold()
    for forbidden in denylist or []:
        if forbidden.casefold() in folded:
            hits.append({"kind": "denylist", "token": "REDACTED_TEST_TOKEN"})
    for kind, pattern in PRIVATE_PATTERNS.items():
        if pattern.search(text):
            hits.append({"kind": kind, "token": "REDACTED_PRIVATE_IDENTIFIER"})
    return hits


def scan_shareable_tree(path: Path, denylist: list[str] | None = None) -> dict[str, object]:
    findings: list[dict[str, str]] = []
    for item in sorted(candidate for candidate in path.rglob("*") if candidate.is_file()):
        try:
            text = item.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for hit in scan_text(text, denylist):
            findings.append({"path": item.relative_to(path).as_posix(), "kind": hit["kind"]})
    return {"scanned_path": str(path), "hits": findings, "publication_allowed": not findings}
