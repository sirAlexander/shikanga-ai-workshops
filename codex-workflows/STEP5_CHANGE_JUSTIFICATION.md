# Step 5 — Deviation and Justification Report

This document compares `multi_agent_workflow_with_logging.py` (latest) to the original `multi_agent_workflow.py`, explains each category of change, and justifies why the change was necessary to complete Step‑5 reliably and reproducibly.

Generated on: 2025-10-25

## Summary of Differences
- Original: `codex-workflows/multi_agent_workflow.py` — 149 lines
- Latest:   `codex-workflows/multi_agent_workflow_with_logging.py` — 248 lines
- Net: +99 lines to add robust logging, deterministic tools, and strict gating/validation.

Key categories:
- Deterministic file IO tools (ensure_dir, write_text_file)
- Strict gating and final validation
- Logging and observability
- Model-compatibility and noise reduction
- Safer/default folder structure for logs and tools

## Detailed Changes and Justifications

### 1) Deterministic File IO instead of relying solely on MCP writes
- What changed:
  - Introduced function tools: `tools/file_tools.py` with `ensure_dir` and `write_text_file`.
  - Agents (Designer, Frontend, Backend, Tester) now prefer `write_text_file` for creating deliverables; MCP writes remain a fallback.
- Why:
  - During Step‑5 runs, Codex MCP sometimes returned non-fatal but disruptive validation noise (e.g., `codex/event` notifications, sporadic 400s for image_url payloads when web search was active). These could cause missing files at gates.
  - Deterministic tool calls guarantee that required files are actually written and available for `check_files`.
- Result:
  - Eliminated flakiness. Gates now pass or fail deterministically based on real files on disk.

### 1.1) Strict ownership model (update)
- What changed:
  - PM is no longer allowed to write into subfolders. A root-only writer tool (`write_root_text_file`) was added and PM uses it only for root files (REQUIREMENTS.md, TEST.md, AGENT_TASKS.md).
  - A workspace reset tool (`reset_output_dirs`) was added and the PM now performs a mandatory cleanup at the start (design/, frontend/, backend/, tests/), ensuring no stale artifacts satisfy gates.
  - PM must hand off to Frontend and Backend and wait for both to return (ack) before testing.
- Why:
  - Guarantees visible handoffs in Traces (especially to Backend Developer) and accurate ownership of deliverables.
  - Prevents false positives caused by leftover files from previous runs.
- Result:
  - Clear, auditable handoffs; correct attribution of artifacts to the right agents; reproducible clean state each run.

### 2) Stronger gated handoffs (Project Manager orchestration)
- What changed:
  - PM now explicitly verifies:
    - Root: `REQUIREMENTS.md`, `TEST.md`, `AGENT_TASKS.md`
    - Design: `design/design_spec.md` AND `design/wireframe.md`
    - Frontend: `frontend/index.html`, `frontend/styles.css`, `frontend/game.js`
    - Backend: `backend/server.js`, `backend/package.json`
  - If missing, PM routes work back to the correct specialist immediately via transfer tokens.
- Why:
  - Original script tested for a subset (`design_spec.md`, `index.html`, `server.js`) which allowed partial progress to appear as success.
  - Step‑5’s “Expected tree” requires all artifacts. Without strict checks, the workflow could end prematurely.
- Result:
  - Workflow only advances when each gate’s full set of files exists, guaranteeing the final tree is complete.

### 3) Final project validation tool wired into PM
- What changed:
  - Added `tools/project_validation_tool.py` with `validate_expected_tree()`.
  - PM performs “FINAL VALIDATION” before concluding; if any item is missing, PM routes to the right agent.
- Why:
  - Creates an authoritative end-of-run proof that Step‑5’s Expected tree is satisfied.
  - Prevents “success” without the exact deliverables.
- Result:
  - The final state is binary and auditable. We also kept a standalone script `validate_step5_expected_tree.py` for manual checks.

### 4) Logging and observability
- What changed:
  - Added rotating log at `logs/workflow_execution.log` and a per-run log `logs/workflow_YYYYMMDD_HHMMSS.log`.
  - Console output trimmed; full details persist to disk.
- Why:
  - Large, multi‑agent runs need traceability to debug gates and handoffs.
  - You requested persistent logs so issues can be pinpointed later.
- Result:
  - Post‑hoc diagnosis is easy. This also pairs well with OpenAI Traces for deeper observability.

### 5) Model‑compatibility and noise reduction
- What changed:
  - Removed explicit `model="gpt-5"` and `ModelSettings(reasoning=...)` to avoid 400 errors when unsupported.
  - Removed `WebSearchTool` to prevent image_url content types which previously triggered server-side validation errors.
- Why:
  - Step‑5 should run on your environment without model‑specific flags causing 400s.
  - The web search wasn’t required to create the expected files; removing it reduced noise and failures.
- Result:
  - Runs proceed without model/parameter mismatch errors and with fewer transient MCP validation messages.

### 6) Folder hygiene per your standards
- What changed:
  - Default log output goes to `logs/` (configurable via `WORKFLOW_LOG_DIR`).
  - Utility tools live under `tools/` with updated imports.
- Why:
  - You requested logs in a log folder and tools in a tools folder.
- Result:
  - Cleaner repo layout and simpler discovery of tools and logs.

### 7) Requirements tightened per stakeholder request (update)
- What changed:
  - Leaderboard and backend integration are now mandatory, not optional.
  - Backend must include `server.js` (in-memory store) and `package.json` with a start script.
- Why:
  - Ensures consistent scope and removes ambiguity that could suppress handoffs or skip backend work.
- Result:
  - PM enforces full stack deliverables; Traces will include both frontend and backend phases.

## Risks and Mitigations
- Added tools increase surface area:
  - Mitigated by keeping tools minimal and deterministic (pure filesystem operations).
- PM logic is stricter:
  - Mitigated by clear transfer routes and explicit checks; if something is missing, the workflow can recover.

## Evidence of Success (current state)
- `validate_step5_expected_tree.py` returns `ok: true` (no missing files) after runs.
- Produced artifacts conform to the Expected tree in the guide.

## Conclusion
The changes were necessary to make Step‑5 reliable, reproducible, and verifiable on your environment. Each modification either removes a source of flakiness, enforces the exact deliverables, or improves traceability and repo hygiene per your standards (logs/, tools/).
