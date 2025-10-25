"""
File IO tools exposed to agents as deterministic function tools.
Prefer these for writing deliverables to avoid MCP flakiness.
"""
from __future__ import annotations
import os
from pathlib import Path
from typing import Optional
from agents import function_tool


@function_tool
def ensure_dir(path: str) -> dict:
    """Ensure a directory exists. Creates parents as needed.

    Args:
        path: Directory path to create if missing.

    Returns: {ok: bool, path: str, created: bool}
    """
    p = Path(path)
    created = False
    if not p.exists():
        p.mkdir(parents=True, exist_ok=True)
        created = True
    return {"ok": True, "path": str(p), "created": created}


@function_tool
def write_text_file(path: str, content: str, create_dirs: bool = True, overwrite: bool = True) -> dict:
    """Write UTF-8 text to a file safely.

    - Creates parent directories if `create_dirs`.
    - Overwrites by default; set `overwrite=False` to avoid clobbering.

    Args:
        path: File path (relative to CWD or absolute).
        content: Text content to write.
        create_dirs: Create parent directories if missing.
        overwrite: If False and file exists, returns ok=False.

    Returns: {ok: bool, path: str, bytes: int, created: bool, overwritten: bool}
    """
    p = Path(path)
    if create_dirs:
        p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and not overwrite:
        return {"ok": False, "path": str(p), "reason": "exists", "bytes": p.stat().st_size, "created": False, "overwritten": False}
    data = content if isinstance(content, str) else str(content)
    with p.open("w", encoding="utf-8") as f:
        f.write(data)
    return {"ok": True, "path": str(p), "bytes": len(data.encode("utf-8")), "created": not p.exists(), "overwritten": True}
