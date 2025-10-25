"""
CheckFilesTool - Deterministic file existence verification for gated workflows.
Eliminates flaky LLM-based file checking.
"""
import os
from agents import function_tool


@function_tool
def check_files(paths: list[str]) -> dict:
    """
    Check if one or more files exist in the filesystem.

    Returns {ok: true, all_exist: true} if all files exist,
    or {ok: false, missing: [list of missing files]} if any are missing.
    Use this to verify gate conditions before proceeding to the next agent.

    Args:
        paths: List of file paths to check (relative or absolute)

    Returns:
        Dictionary with ok (bool), all_exist (bool), missing (list), existing (list)
    """
    missing = []
    existing = []

    for path in paths:
        # Handle both absolute and relative paths
        if os.path.isabs(path):
            full_path = path
        else:
            # Relative to current working directory
            full_path = os.path.join(os.getcwd(), path)

        if os.path.exists(full_path) and os.path.isfile(full_path):
            existing.append(path)
        else:
            missing.append(path)

    all_exist = len(missing) == 0

    return {
        "ok": all_exist,
        "all_exist": all_exist,
        "missing": missing,
        "existing": existing,
        "checked_count": len(paths),
        "cwd": os.getcwd()
    }
