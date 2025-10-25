# Shikanga AI Workshops

A comprehensive collection of AI and Large Language Model workshops and learning materials.

## Learning Path

### 1. Introduction to Large Language Models

**[Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g&ab_channel=AndrejKarpathy)** by Andrej Karpathy
- Foundational understanding of how LLMs work
- Essential concepts and architecture

### 2. LangChain4J

**[LangChain4J Tutorials](https://docs.langchain4j.dev/category/tutorials)**
- Practical implementation guides
- Building AI applications with Java

**Additional Resources:**
- [Useful Materials](https://docs.langchain4j.dev/useful-materials) - Supplementary learning content

---

## 🚀 Featured Workshop: Building Multi-Agent Workflows

### **[Building Consistent Workflows with Codex CLI & OpenAI Agents SDK](codex/codex-mcp-agents-sdk/building-consistent-workflows-codex-agents-step-by-step.md)**

> **Turn Codex CLI into an MCP server, build a single-agent workflow, and scale to a gated multi-agent system with traceability and repeatability.**

#### 🎯 What You'll Build

**Project 1: Single-Agent Game Generator**
- Designer hands off to Developer
- Automatically generates a working browser game (`index.html`)
- Uses Codex via MCP for file operations

**Project 2: Full Multi-Agent System**
- **PM → Designer → (Frontend + Backend in parallel) → Tester**
- Complete "Bug Busters" browser game with leaderboard
- Gated handoffs with observable traces
- Production-ready workflow patterns

#### 📦 Final Project Structure
```
codex-workflows/
├── REQUIREMENTS.md
├── AGENT_TASKS.md
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

#### ✨ What Makes This Workshop Special

- **Hands-on, step-by-step** - Incremental builds from single to multi-agent
- **Real code generation** - Watch agents write actual working applications
- **Traceable workflows** - See every handoff and decision in OpenAI dashboard
- **Gated handoffs** - Agents only proceed when required artifacts exist
- **Safe execution** - Sandboxed workspace with approval policies
- **Repeatable patterns** - Apply these techniques to any project

#### 🛠️ Technologies Covered

- OpenAI Agents SDK
- Model Context Protocol (MCP)
- Codex CLI as MCP server
- Parallel agent execution
- Workflow orchestration
- Trace observability

#### 🎓 Perfect For

- Developers exploring agentic AI workflows
- Teams building multi-agent systems
- Anyone wanting hands-on agent orchestration experience
- Projects requiring traceable, gated automation

**[→ Start the Step-by-Step Guide](codex/codex-mcp-agents-sdk/building-consistent-workflows-codex-agents-step-by-step.md)**

---
