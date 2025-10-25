"""
Test script for check_files tool
"""
import os
import sys

from tools.check_files_tool import check_files

print("=== Testing check_files tool ===\n")

def test_check_files(paths):
    """Test implementation matching check_files_tool.py"""
    missing = []
    existing = []

    for path in paths:
        if os.path.isabs(path):
            full_path = path
        else:
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

# Test 1: Check existing files
print("Test 1: Checking existing files (REQUIREMENTS.md, TEST.md, AGENT_TASKS.md)")
result = test_check_files(["REQUIREMENTS.md", "TEST.md", "AGENT_TASKS.md"])
print(f"Result: {result}")
print(f"Expected: ok=True, all 3 files should exist\n")

# Test 2: Check non-existing files
print("Test 2: Checking non-existing files")
result = test_check_files(["nonexistent.md", "fake.txt"])
print(f"Result: {result}")
print(f"Expected: ok=False, missing=['nonexistent.md', 'fake.txt']\n")

# Test 3: Mix of existing and non-existing
print("Test 3: Mix of existing and non-existing files")
result = test_check_files(["REQUIREMENTS.md", "nonexistent.md"])
print(f"Result: {result}")
print(f"Expected: ok=False, missing=['nonexistent.md'], existing=['REQUIREMENTS.md']\n")

# Test 4: Check with relative paths
print("Test 4: Checking with subdirectory paths (that don't exist)")
result = test_check_files(["design/design_spec.md", "frontend/index.html"])
print(f"Result: {result}")
print(f"Expected: ok=False, both should be missing\n")

print("=== Tool attributes ===")
print(f"Tool name: {check_files.name}")
print(f"Tool type: {type(check_files)}")
print(f"Tool description: {check_files.description}")
print(f"Has params_json_schema: {hasattr(check_files, 'params_json_schema')}")
if hasattr(check_files, 'params_json_schema'):
    print(f"Params schema: {check_files.params_json_schema}")
