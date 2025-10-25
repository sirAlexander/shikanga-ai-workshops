"""
Project validation tools exposed to agents.
"""
from __future__ import annotations
from pathlib import Path
from typing import List, Optional, Dict, Any
from agents import function_tool


EXPECTED_TREE: List[str] = [
    "AGENT_TASKS.md",
    "REQUIREMENTS.md",
    "TEST.md",
    "design/design_spec.md",
    "design/wireframe.md",
    "frontend/index.html",
    "frontend/styles.css",
    "frontend/game.js",
    "backend/server.js",
    "backend/package.json",
]


@function_tool
def validate_expected_tree(files: Optional[List[str]] = None) -> Dict[str, Any]:
    """Validate the presence of the Step-5 expected project tree.

    Args:
        files: Optional override list of file paths to validate. If omitted, uses the standard expected list.

    Returns:
        dict with: ok (bool), present (list), missing (list), cwd (str), expected_count (int)
    """
    paths = files if files else EXPECTED_TREE
    missing: List[str] = []
    present: List[str] = []
    cwd = Path.cwd()

    for p in paths:
        fp = cwd / p
        if fp.is_file():
            present.append(p)
        else:
            missing.append(p)

    return {
        "ok": len(missing) == 0,
        "present": present,
        "missing": missing,
        "cwd": str(cwd),
        "expected_count": len(paths),
    }
