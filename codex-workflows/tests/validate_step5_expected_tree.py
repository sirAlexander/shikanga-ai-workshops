import json
from tools.project_validation_tool import validate_expected_tree


def main() -> int:
    result = validate_expected_tree()
    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
