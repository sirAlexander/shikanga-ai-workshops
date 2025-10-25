# Building Consistent Workflows with Codex CLI & the OpenAI Agents SDK — A Step-by-Step Guide

> Turn Codex CLI into an MCP server, build a single-agent workflow, and scale to a gated multi-agent system with traceability and repeatability.


> An improved open-ai cookbook that has been updated so that its now laid out as a hands-on, step-by-step tutorial

---

## What you’ll build
1) **Single-agent**: “Designer” hands off to a “Developer” that uses **Codex (via MCP)** to generate a tiny browser game (`index.html`).  
2) **Multi-agent**: PM → Designer → Frontend + Backend (parallel) → Tester, with **gated handoffs** and **observable traces**.

---

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

## Step 1 — Project setup (new directory)
```bash
mkdir codex-workflows && cd codex-workflows

# Save API key
printf "OPENAI_API_KEY=sk-REPLACE_ME\n" > .env

# Python virtual env
python -m venv .venv
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
python sanity_agents.py
```

**Codex availability**
```bash
codex --version     # if installed globally
# or
npx -y codex --version
```

---

## Step 3 — Start Codex as an MCP server (stdio)
Create `codex_mcp.py`:
```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def main() -> None:
    async with MCPServerStdio(
        name="Codex CLI",
        params={"command": "npx", "args": ["-y", "codex", "mcp"]},
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
python codex_mcp.py
```
**Expect:** `Codex MCP server started.`

---

## Step 4 — Single-agent workflow: tiny game generator
Replace `codex_mcp.py` with:
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
        params={"command": "npx", "args": ["-y", "codex", "mcp"]},
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
python codex_mcp.py
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

## Step 5 — Multi-agent workflow with gated handoffs
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
        params={"command": "npx", "args": ["-y", "codex", "mcp"]},
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
python multi_agent_workflow.py
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

## Step 6 — Traces (observability)
- View runs in **OpenAI dashboard → Traces**.  
- Inspect spans for prompts, MCP tool calls, file writes, timings, and handoffs.  
- Use traces to confirm gating order and troubleshoot bottlenecks.

---

## Step 7 — Troubleshooting & tips
- **Codex can’t write / asks for approval** → ensure instructions include  
  `{"approval-policy":"never","sandbox":"workspace-write"}` and you’re running in the project directory.  
- **`npx` is slow** → install Codex globally and change:
  ```python
  params={"command":"codex","args":["mcp"]}
  ```
- **MCP timeouts** → keep `client_session_timeout_seconds` large for long tasks.  
- **Windows venv activation** → if blocked, run PowerShell as user/admin and  
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.  
- **Version pinning** → check `requirements.txt` into your repo for repeatable envs/CI.

---

## Step 8 — What you now have
- **Repeatable** agent orchestration using Codex MCP with safe file-write policies.  
- **Gated** handoffs that only proceed when required artifacts exist.  
- **Traceable** executions visible in the Traces dashboard.


> _Reference_: [openai original cookbook](https://github.com/openai/openai-cookbook/blob/main/examples/codex/codex_mcp_agents_sdk/building_consistent_workflows_codex_cli_agents_sdk.ipynb)