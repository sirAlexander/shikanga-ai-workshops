# Codex MCP + OpenAI Agents SDK — Example Workflows

This repo demonstrates how to run Codex CLI as an MCP server with the OpenAI Agents SDK, first for a **single-agent** workflow, then for a **gated multi-agent** workflow with traceability.

## Quick start
```bash
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
npm i -g @openai/codex

# set your key
echo OPENAI_API_KEY=sk-REPLACE_ME > .env

# run single-agent
python codex_mcp.py

# run multi-agent
python multi_agent_workflow.py
```

> The full, step-by-step guide lives here:  
> **building-consistent-workflows-codex-agents-step-by-step.md**

## CI
A GitHub Actions workflow is included at **.github/workflows/agents-workflow.yml**.  
It expects **OPENAI_API_KEY** to be set in your repository **Secrets**.
