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
