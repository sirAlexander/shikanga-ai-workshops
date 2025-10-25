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