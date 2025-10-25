from __future__ import annotations
import shutil
from pathlib import Path
from typing import Dict, Any, List
from agents import function_tool


ALLOWED_OUTPUT_DIRS = ["design", "frontend", "backend", "tests"]


@function_tool
def reset_output_dirs() -> Dict[str, Any]:
    """Delete and recreate the standard output folders: design/, frontend/, backend/, tests/.

    Returns a dict with details of which paths were removed and recreated.
    """
    cwd = Path.cwd()
    removed: List[str] = []
    created: List[str] = []

    for name in ALLOWED_OUTPUT_DIRS:
        d = cwd / name
        if d.exists():
            shutil.rmtree(d)
            removed.append(str(d))
        d.mkdir(parents=True, exist_ok=True)
        created.append(str(d))

    return {
        "ok": True,
        "removed": removed,
        "created": created,
        "cwd": str(cwd),
    }


@function_tool
def write_root_text_file(path: str, content: str, overwrite: bool = True) -> Dict[str, Any]:
    """Write a text file at the project root only (no subdirectories allowed).

    Args:
        path: Filename at the project root (e.g., REQUIREMENTS.md). Must not contain '/'.
        content: Text content to write.
        overwrite: If False and file exists, returns ok=False.
    """
    p = Path(path)
    if p.parts and (len(p.parts) > 1 or p.as_posix().find("/") != -1):
        return {"ok": False, "reason": "path must be root-level only", "path": str(p)}

    fp = Path.cwd() / p.name
    if fp.exists() and not overwrite:
        return {"ok": False, "reason": "exists", "path": str(fp)}

    data = content if isinstance(content, str) else str(content)
    fp.write_text(data, encoding="utf-8")
    return {"ok": True, "path": str(fp), "bytes": len(data.encode("utf-8")), "overwritten": True}

