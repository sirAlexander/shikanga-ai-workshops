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
            model="gpt-5",
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