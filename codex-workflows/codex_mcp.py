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