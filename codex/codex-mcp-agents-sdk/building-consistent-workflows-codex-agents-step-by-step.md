# Building Consistent Workflows with Codex CLI & the OpenAI Agents SDK — A Step-by-Step Guide

> Turn Codex CLI into an MCP server, build a single-agent workflow and scale to a gated multi-agent system with traceability and repeatability.

> An improved open-ai cookbook that has been updated so that its now laid out as a hands-on, step-by-step tutorial
> 
---

## Table of Contents
- [What you’ll build](#toc-what-youll-build)
- [Step 0 — Prerequisites](#step-0)
- [Step 1 — Project setup](#step-1)
- [Step 2 — Quick sanity checks](#step-2)
- [Step 3 — Start Codex as an MCP server](#step-3)
- [Step 4 — Single-agent workflow: tiny game generator](#step-4)
- [Step 5 — Multi-agent workflow with gated handoffs](#step-5)
- [Step 6 — Traces (observability)](#step-6)
- [Step 7 — Troubleshooting & tips](#step-7)
- [Step 8 — What you now have](#step-8)

---


<a id="toc-what-youll-build"></a>
## What you’ll build
1) **Single-agent**: “Designer” hands off to a “Developer” that uses **Codex (via MCP)** to generate a tiny browser game (`index.html`).  
2) **Multi-agent**: PM → Designer → Frontend + Backend (parallel) → Tester, with **gated handoffs** and **observable traces**.

---

<a id="step-0"></a>
## Step 0 — Prerequisites (once per machine)
- **Node.js 18+**
  ```bash
  node -v
  ```
- **Codex CLI** (choose one):
  - Faster repeat runs (recommended):
    ```bash
    npm i -g @openai/codex
    codex --version
    codex mcp --help
    ```
  - Or ad-hoc per run (no global install): use `npx -y codex ...` (slower cold start).
- **Python 3.10+**
  ```bash
  python --version    # or python3 --version
  ```
- **OpenAI API key** (we’ll place it in `.env`).

---

<a id="step-1"></a>
## Step 1 — Project setup (new directory)
```bash
mkdir codex-workflows && cd codex-workflows

# Save API key
printf "OPENAI_API_KEY=sk-REPLACE_ME\n" > .env

# Python virtual env
python3 -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .\.venv\Scripts\Activate.ps1

# (If PowerShell blocks scripts)
# Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# Install packages
pip install --upgrade pip
pip install openai openai-agents python-dotenv

# (Optional, for repeatability) pin versions
printf "openai\nopenai-agents\npython-dotenv\n" > requirements.txt
# Later: pip install -r requirements.txt
```

---

<a id="step-2"></a>
## Step 2 — Quick sanity checks
**Agents SDK import**
```python
# sanity_agents.py
try:
    from agents import Agent, Runner
    print("Agents SDK import OK")
except Exception as e:
    print("Agents SDK import failed:", e)
```
```bash
python3 sanity_agents.py
```

**Codex availability**
```bash
codex --version     # if installed globally
# or
npx -y codex --version
```

---

<a id="step-3"></a>
## Step 3 — Start Codex as an MCP server (stdio)
Create `test_codex_mcp.py`:
```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def main() -> None:
    async with MCPServerStdio(
            name="Codex CLI",
            params={"command": "codex", "args": ["mcp-server"]},
            client_session_timeout_seconds=360000,
    ) as codex_mcp_server:
        print("Codex MCP server started.")
        # Add agent logic in next steps
        return

if __name__ == "__main__":
    asyncio.run(main())
```

Run once:
```bash
python3 test_codex_mcp.py
```
**Expect:** `Codex MCP server started.`

---

<a id="step-4"></a>
## Step 4 — Single-agent workflow: tiny game generator
Create `codex_mcp.py`:
```python
import os, asyncio
from dotenv import load_dotenv
from agents import Agent, Runner, set_default_openai_api
from agents.mcp import MCPServerStdio

load_dotenv(override=True)
set_default_openai_api(os.getenv("OPENAI_API_KEY"))

async def main() -> None:
    async with MCPServerStdio(
            name="Codex CLI",
            params={"command": "codex", "args": ["mcp-server"]},
            client_session_timeout_seconds=360000,
    ) as codex_mcp_server:

        developer = Agent(
            name="Game Developer",
            instructions=(
                "You are an expert in building simple games using basic html + css + javascript with no dependencies. "
                "Save your work in a file called index.html in the current directory. "
                "Always call codex with \"approval-policy\":\"never\" and \"sandbox\":\"workspace-write\"."
            ),
            mcp_servers=[codex_mcp_server],
        )

        designer = Agent(
            name="Game Designer",
            instructions=(
                "You are an indie game connoisseur. Propose a single-page HTML/CSS/JS game a developer can build in ~50 lines. "
                "Write a 3-sentence design brief and hand off to the Game Developer with transfer_to_game_developer."
            ),
            # Optional explicit model:
            # model="gpt-5",
            handoffs=[developer],
        )

        await Runner.run(designer, "Implement a fun new game!")

if __name__ == "__main__":
    asyncio.run(main())
```

Run:
```bash
python3 codex_mcp.py
```

**Success check:** `index.html` appears at project root.  
Open it:
- macOS: `open index.html`  
- Linux: `xdg-open index.html`  
- Windows: `start .\index.html`

> **Why these Codex flags?**  
> `approval-policy: "never"` avoids manual approvals during writes;  
> `sandbox: "workspace-write"` restricts writes to this workspace for safety.

---

<a id="step-5"></a>
## Step 5.1 — Multi-agent workflow with gated handoffs ( buggy flawed, original version )
Create `multi_agent_workflow.py`:
```python
import os, asyncio
from dotenv import load_dotenv
from agents import Agent, Runner, WebSearchTool, ModelSettings, set_default_openai_api
from agents.mcp import MCPServerStdio
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from openai.types.shared import Reasoning

load_dotenv(override=True)
set_default_openai_api(os.getenv("OPENAI_API_KEY"))

async def main() -> None:
    async with MCPServerStdio(
        name="Codex CLI",
        params={"command": "codex", "args": ["mcp-server"]},
        client_session_timeout_seconds=360000,
    ) as codex_mcp_server:

        designer = Agent(
            name="Designer",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "You are the Designer.\n"
                "Your only source of truth is AGENT_TASKS.md and REQUIREMENTS.md from the Project Manager.\n"
                "Do not assume anything not written there.\n\n"
                "Deliverables (write to /design):\n"
                "- design_spec.md – one page describing UI/UX layout\n"
                "- wireframe.md – simple text/ASCII wireframe if specified\n\n"
                "Keep the output short and implementation-friendly.\n"
                "When complete, hand off to the Project Manager with transfer_to_project_manager.\n"
                "When creating files, call Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            # model="gpt-5",
            tools=[WebSearchTool()],
            mcp_servers=[codex_mcp_server],
        )

        frontend = Agent(
            name="Frontend Developer",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "Read AGENT_TASKS.md and design_spec.md. Implement exactly what is described.\n\n"
                "Deliverables (write to /frontend):\n"
                "- index.html\n- styles.css (or inline)\n- game.js (or main.js)\n\n"
                "Follow the Designer’s DOM structure; no extra features.\n"
                "When complete, hand off to the Project Manager with transfer_to_project_manager.\n"
                "When creating files, call Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            # model="gpt-5",
            mcp_servers=[codex_mcp_server],
        )

        backend = Agent(
            name="Backend Developer",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "Read AGENT_TASKS.md and REQUIREMENTS.md. Implement the API endpoints.\n\n"
                "Deliverables (write to /backend):\n"
                "- package.json (with a start script)\n"
                "- server.js (minimal API per requirements; in-memory storage)\n\n"
                "Keep code simple and readable; no DB.\n"
                "When complete, hand off to the Project Manager with transfer_to_project_manager.\n"
                "When creating files, call Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            # model="gpt-5",
            mcp_servers=[codex_mcp_server],
        )

        tester = Agent(
            name="Tester",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "Read AGENT_TASKS.md and TEST.md. Verify outputs meet acceptance criteria.\n\n"
                "Deliverables (write to /tests):\n"
                "- TEST_PLAN.md\n- test.sh (optional)\n\n"
                "Keep it minimal.\n"
                "When complete, hand off to the Project Manager with transfer_to_project_manager.\n"
                "When creating files, call Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            # model="gpt-5",
            mcp_servers=[codex_mcp_server],
        )

        project_manager = Agent(
            name="Project Manager",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                """
                You are the Project Manager.

                Objective:
                Convert the input task list into three project-root files the team will execute against.

                Deliverables (write in project root):
                - REQUIREMENTS.md
                - TEST.md
                - AGENT_TASKS.md

                Process:
                - Resolve ambiguities with minimal assumptions; be specific.
                - Create files using Codex MCP with {"approval-policy":"never","sandbox":"workspace-write"}.

                Handoffs (gated by required files):
                1) After the three root files exist, hand off to the Designer (transfer_to_designer).
                2) Wait for /design/design_spec.md to exist.
                3) Then hand off in parallel to:
                   - Frontend Developer (transfer_to_frontend_developer) with design_spec.md, REQUIREMENTS.md, AGENT_TASKS.md
                   - Backend Developer (transfer_to_backend_developer) with REQUIREMENTS.md, AGENT_TASKS.md
                4) Wait for /frontend/index.html and /backend/server.js to exist.
                5) Then hand off to the Tester (transfer_to_tester) with all artifacts.
                6) Do not advance until required files exist; request fixes as needed.
                """
            ),
            # model="gpt-5",
            model_settings=ModelSettings(reasoning=Reasoning(effort="medium")),
            handoffs=[designer, frontend, backend, tester],
            mcp_servers=[codex_mcp_server],
        )

        # Specialists return to PM
        designer.handoffs = [project_manager]
        frontend.handoffs = [project_manager]
        backend.handoffs  = [project_manager]
        tester.handoffs   = [project_manager]

        task_list = """
Goal: Build a tiny browser game to showcase a multi-agent workflow.

High-level requirements:
- Single-screen game called "Bug Busters".
- Player clicks a moving bug to earn points.
- Game ends after 20 seconds and shows final score.
- Optional: submit score to a simple backend and display a top-10 leaderboard.

Roles:
- Designer: create a one-page UI/UX spec and basic wireframe.
- Frontend Developer: implement the page and game logic.
- Backend Developer: implement a minimal API (GET /health, GET/POST /scores).
- Tester: write a quick test plan and a simple script to verify core routes.

Constraints:
- No external database—memory storage is fine.
- Keep everything readable for beginners; no frameworks required.
- All outputs should be small files saved in clearly named folders.
"""

        result = await Runner.run(project_manager, task_list, max_turns=30)
        print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
```

Run:
```bash
python3 multi_agent_workflow.py
```

**Results in lots and lots of ERRORS!**

## Step 5.2 — Multi-agent workflow with gated handoffs, useful logging and deterministic tools ( fixed by Shikanga )
Create `multi_agent_workflow_with_logging.py`:
```python
import os, asyncio, logging
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from agents import Agent, Runner, WebSearchTool, ModelSettings, set_default_openai_api
from agents.mcp import MCPServerStdio
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from openai.types.shared import Reasoning
from tools.check_files_tool import check_files
from tools.file_tools import ensure_dir, write_text_file
from tools.project_validation_tool import validate_expected_tree
from tools.workspace_tools import reset_output_dirs, write_root_text_file

def _setup_logging() -> logging.Logger:
    level_name = os.getenv("WORKFLOW_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    script_dir = Path(__file__).resolve().parent
    # Default logs directory under project; override with WORKFLOW_LOG_DIR
    log_dir = Path(os.getenv("WORKFLOW_LOG_DIR", str(script_dir / "logs")))
    log_dir.mkdir(parents=True, exist_ok=True)

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    main_log = log_dir / "workflow_execution.log"
    run_log = log_dir / f"workflow_{run_id}.log"

    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    root = logging.getLogger()
    root.setLevel(level)

    # Clear existing handlers to prevent duplicates on reload
    for h in list(root.handlers):
        root.removeHandler(h)

    try:
        from logging.handlers import RotatingFileHandler
        rotating = RotatingFileHandler(main_log, maxBytes=10 * 1024 * 1024, backupCount=5)
        rotating.setFormatter(formatter)
        root.addHandler(rotating)
    except Exception:
        # Fallback if rotating handler not available
        fh = logging.FileHandler(main_log)
        fh.setFormatter(formatter)
        root.addHandler(fh)

    per_run = logging.FileHandler(run_log)
    per_run.setFormatter(formatter)
    root.addHandler(per_run)

    sh = logging.StreamHandler()
    sh.setFormatter(formatter)
    root.addHandler(sh)

    logger = logging.getLogger(__name__)
    logger.info("Logging initialized. main=%s per_run=%s level=%s", main_log, run_log, level_name)

    return logger

logger = _setup_logging()

load_dotenv(override=True)
set_default_openai_api(os.getenv("OPENAI_API_KEY"))

async def main() -> None:
    logger.info("Starting multi-agent workflow")

    async with MCPServerStdio(
            name="Codex CLI",
            params={"command": "codex", "args": ["mcp-server"]},
            client_session_timeout_seconds=360000,
    ) as codex_mcp_server:
        logger.info("Codex MCP server connected")

        designer = Agent(
            name="Designer",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "You are the Designer.\n"
                "Your only source of truth is AGENT_TASKS.md and REQUIREMENTS.md from the Project Manager.\n"
                "Do not assume anything not written there.\n\n"
                "Deliverables (write to /design):\n"
                "- design_spec.md – one page describing UI/UX layout\n"
                "- wireframe.md – simple text/ASCII wireframe if specified\n\n"
                "Keep the output short and implementation-friendly.\n"
                "When complete, DO NOT give a final answer; hand off to the Project Manager with transfer_to_project_manager as the last line.\n"
                "File IO: Prefer the write_text_file tool to create /design/design_spec.md and /design/wireframe.md.\n"
                "If write_text_file is unavailable, then use Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            # Avoid web search to reduce noisy image_url content
            # tools=[WebSearchTool()],
            tools=[ensure_dir, write_text_file, check_files],
            mcp_servers=[codex_mcp_server],
        )
        logger.info("Designer agent created")

        frontend = Agent(
            name="Frontend Developer",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "Read AGENT_TASKS.md and design_spec.md. Implement exactly what is described.\n\n"
                "Deliverables (write to /frontend):\n"
                "- index.html\n- styles.css (or inline)\n- game.js (or main.js)\n\n"
                "Follow the Designer's DOM structure; no extra features.\n"
                "When complete, DO NOT give a final answer; hand off to the Project Manager with transfer_to_project_manager as the last line.\n"
                "File IO: Prefer write_text_file; otherwise use Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            tools=[ensure_dir, write_text_file, check_files],
            mcp_servers=[codex_mcp_server],
        )
        logger.info("Frontend Developer agent created")

        backend = Agent(
            name="Backend Developer",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "Read AGENT_TASKS.md and REQUIREMENTS.md. Implement the API endpoints.\n\n"
                "Deliverables (write to /backend):\n"
                "- package.json (with a start script)\n"
                "- server.js (minimal API per requirements; in-memory storage)\n\n"
                "Keep code simple and readable; no DB.\n"
                "When complete, DO NOT give a final answer; hand off to the Project Manager with transfer_to_project_manager as the last line.\n"
                "File IO: Prefer write_text_file; otherwise use Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            tools=[ensure_dir, write_text_file, check_files],
            mcp_servers=[codex_mcp_server],
        )
        logger.info("Backend Developer agent created")

        tester = Agent(
            name="Tester",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                "Read AGENT_TASKS.md and TEST.md. Verify outputs meet acceptance criteria.\n\n"
                "Deliverables (write to /tests):\n"
                "- TEST_PLAN.md\n- test.sh (optional)\n\n"
                "Keep it minimal.\n"
                "When complete, DO NOT give a final answer; hand off to the Project Manager with transfer_to_project_manager as the last line.\n"
                "File IO: Prefer write_text_file; otherwise use Codex MCP with {\"approval-policy\":\"never\",\"sandbox\":\"workspace-write\"}."
            ),
            tools=[ensure_dir, write_text_file, check_files],
            mcp_servers=[codex_mcp_server],
        )
        logger.info("Tester agent created")

        project_manager = Agent(
            name="Project Manager",
            instructions=(
                f"""{RECOMMENDED_PROMPT_PREFIX}"""
                """
                You are the Project Manager.

                Objective:
                Convert the input task list into three project-root files the team will execute against.

                Deliverables (write in project root):
                - REQUIREMENTS.md
                - TEST.md
                - AGENT_TASKS.md

                Process (STRICT, GATED, OWNERSHIP):
                0) MANDATORY CLEANUP: call reset_output_dirs() at the start to remove any previous artifacts in design/, frontend/, backend/, tests/.
                1) Ensure directories exist: design/, frontend/, backend/, tests/ (use ensure_dir).
                2) Create the three ROOT files using write_root_text_file (ROOT ONLY). You are NOT allowed to create files inside subfolders.
                    Then VERIFY they exist using check_files(["REQUIREMENTS.md", "TEST.md", "AGENT_TASKS.md"]).
                   If check_files returns ok: false, fix the missing files and re-check.
                   Only when check_files returns ok: true, hand off to the Designer with transfer_to_designer.

                3) Wait for the Designer to return. VERIFY design files exist using check_files(["design/design_spec.md", "design/wireframe.md"]).
                   If check_files returns ok: false, ask Designer to correct and re-check, then immediately transfer_to_designer.
                   Only when check_files returns ok: true, hand off to BOTH (MANDATORY):
                      - Frontend Developer with transfer_to_frontend_developer
                      - Backend Developer with transfer_to_backend_developer

                4) MANDATORY ACK: Wait for BOTH Frontend and Backend to return (each must transfer_to_project_manager at least once).
                   VERIFY using check_files([
                      "frontend/index.html", "frontend/styles.css", "frontend/game.js",
                      "backend/server.js", "backend/package.json"
                   ]).
                   If check_files returns ok: false, request the owning agent to fix and re-check, then transfer to that agent.
                   Only when check_files returns ok: true, hand off to the Tester with transfer_to_tester.

                5) When the Tester returns, perform FINAL VALIDATION using validate_expected_tree().
                   - If ok: true, you may conclude with a short final statement.
                   - If ok: false, route missing files to the proper agent based on their path:
                       design/* -> transfer_to_designer; frontend/* -> transfer_to_frontend_developer; backend/* -> transfer_to_backend_developer; root files -> create them or fix via your own actions, then re-check.
                   - Do NOT produce a final answer until validate_expected_tree().ok is true.

                Rules:
                - You may only create ROOT files using write_root_text_file. You MUST NOT create or edit files in design/, frontend/, backend/, or tests/.
                - When writing into a new subfolder, ensure the folder exists first using ensure_dir.
                - Always use check_files and validate_expected_tree tools to verify gates before proceeding.
                - Never proceed to the next step if check_files returns ok: false.
                - Use precise, concise messages. Focus on actions and checks, not status monologues.
                - Use transfer_to_designer (not transfer_to_designer()) - no parentheses.
                - Do NOT produce a final answer until after step 4 (Tester returns). Always continue with the appropriate transfer token.
                """
            ),
            # Omit reasoning settings for broad model compatibility
            tools=[reset_output_dirs, ensure_dir, write_root_text_file, check_files, validate_expected_tree],
            handoffs=[designer, frontend, backend, tester],
            mcp_servers=[codex_mcp_server],
        )
        logger.info("Project Manager agent created")

        # Specialists return to PM
        designer.handoffs = [project_manager]
        frontend.handoffs = [project_manager]
        backend.handoffs  = [project_manager]
        tester.handoffs   = [project_manager]
        logger.info("Handoff connections established")

        task_list = """
Goal: Build a tiny browser game to showcase a multi-agent workflow.

High-level requirements:
- Single-screen game called "Bug Busters".
- Player clicks a moving bug to earn points.
- Game ends after 20 seconds and shows final score.
- Submit score to a simple backend and display a top-10 leaderboard (MANDATORY).

Roles:
- Designer: create a one-page UI/UX spec and basic wireframe.
- Frontend Developer: implement the page and game logic.
- Backend Developer: implement a minimal API (GET /health, GET/POST /scores) with in-memory storage; provide package.json with a start script.
- Tester: write a quick test plan and a simple script to verify core routes.

Constraints:
- No external database—memory storage is fine.
- Keep everything readable for beginners; no frameworks required.
- All outputs should be small files saved in clearly named folders.
"""

        logger.info("Starting workflow execution with max_turns=100")
        try:
            result = await Runner.run(project_manager, task_list, max_turns=100)
            logger.info(f"Workflow completed. Final output: {result.final_output}")
            logger.info(f"Result details: {result}")
            print("\n=== FINAL OUTPUT ===")
            print(result.final_output)
            print("\n=== RESULT DETAILS ===")
            print(f"Turns used: {getattr(result, 'turn_count', 'N/A')}")
            print(f"Status: {getattr(result, 'status', 'N/A')}")
        except Exception as e:
            logger.error(f"Workflow failed with error: {e}", exc_info=True)
            raise

if __name__ == "__main__":
    asyncio.run(main())
```

**Expected tree:**
```
.
├── AGENT_TASKS.md
├── REQUIREMENTS.md
├── TEST.md
├── design/
│   ├── design_spec.md
│   └── wireframe.md
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── game.js
└── backend/
    ├── package.json
    └── server.js
```

Start & open:
```bash
# backend
node backend/server.js

# frontend
# macOS:
open frontend/index.html
# Linux:
xdg-open frontend/index.html
# Windows:
start .\frontend\index.html
```

---

<a id="step-6"></a>
## Step 6 — Traces (observability)
- View runs in **OpenAI dashboard → Traces**.  
- Inspect spans for prompts, MCP tool calls, file writes, timings and handoffs.  
- Use traces to confirm gating order and troubleshoot bottlenecks.

---

<a id="step-7"></a>
## Step 7 — Troubleshooting & tips
- **Codex can’t write / asks for approval** → ensure instructions include  
  `{"approval-policy":"never","sandbox":"workspace-write"}` and you’re running in the project directory.  
- **`npx` is slow** → install Codex globally and change:
  ```python
  old - params={"command":"codex","args":["mcp"]}
  
  new - params={"command": "codex", "args": ["mcp-server"]},
  ```
- **MCP timeouts** → keep `client_session_timeout_seconds` large for long tasks.  
- **Windows venv activation** → if blocked, run PowerShell as user/admin and  
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.  
- **Version pinning** → check `requirements.txt` into your repo for repeatable envs/CI.

---

<a id="step-8"></a>
## Step 8 — What you now have
- **Repeatable** agent orchestration using Codex MCP with safe file-write policies.  
- **Gated** handoffs that only proceed when required artifacts exist.  
- **Traceable** executions visible in the Traces dashboard.


> _Reference_: [openai original cookbook](https://github.com/openai/openai-cookbook/blob/main/examples/codex/codex_mcp_agents_sdk/building_consistent_workflows_codex_cli_agents_sdk.ipynb)

---

Looking for the completed project and run pointers? See the companion README in the workflows folder: [../../codex-workflows/README.md](../../codex-workflows/README.md)
