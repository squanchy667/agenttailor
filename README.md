# AgentTailor

<p align="center">
  <img src="./docs/assets/hero.jpg" alt="AgentTailor" width="300" />
</p>

**The context engine that makes AI agents dramatically better.**

AgentTailor is a dual-pipeline platform that (1) automatically assembles optimal context from your documents and the web for any AI conversation, and (2) generates production-ready AI agent definitions tailored to your project. It works across ChatGPT, Claude, MCP, and any LLM — so you get better answers without manual prompt engineering.

---

## Two Pipelines, One Platform

```
                 ┌─────────────────────────────────────┐
                 │       SHARED INFRASTRUCTURE          │
                 │  Doc Processing  ·  Vector DB        │
                 │  Scoring  ·  Compression  ·  Web     │
                 └────────────┬──────────┬──────────────┘
                              │          │
             ┌────────────────┘          └─────────────────┐
             ▼                                             ▼
  ┌──────────────────────┐                    ┌─────────────────────────┐
  │  PIPELINE A           │                    │  PIPELINE B              │
  │  Context Assembly     │                    │  Agent Factory           │
  │                       │                    │                          │
  │  Task → Retrieve →    │                    │  Requirement → Discover  │
  │  Score → Compress →   │                    │  Online Configs → Score  │
  │  Format → Inject      │                    │  & Merge → Generate →   │
  │                       │                    │  Export (Claude/Cursor/  │
  │  Delivery: Extension, │                    │  System Prompt)          │
  │  MCP, API, GPT Store  │                    │                          │
  └──────────────────────┘                    └─────────────────────────┘
```

**Pipeline A** — Give it a task, get back a perfectly curated context package from your docs + web search, formatted for your target AI platform.

**Pipeline B** — Describe the agent you need (role, stack, domain), and it discovers proven configs online, merges them with your project docs, and generates a production-ready agent definition.

---

## Quick Start

### Option 1: Local Mode (zero API keys)

```bash
git clone https://github.com/yourusername/agenttailor.git
cd agenttailor
npm run setup   # docker compose + install + db push + seed
npm run dev     # server :4000, dashboard :5173
```

Open http://localhost:5173 and you're ready. Local mode uses built-in embeddings (`@xenova/transformers`), no auth, and a pre-seeded user with a "Getting Started" project.

### Option 2: MCP Server (Claude Desktop / Claude Code)

Add to your MCP config (`~/.claude/settings.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "agent-tailor": {
      "command": "npx",
      "args": ["agent-tailor-mcp"],
      "env": {
        "AGENTTAILOR_API_URL": "http://localhost:4000"
      }
    }
  }
}
```

This gives you 7 tools inside Claude:

| MCP Tool | What It Does |
|----------|-------------|
| `tailor_context` | Assemble optimal context for a task from your docs + web |
| `search_docs` | Semantic search across your uploaded documents |
| `upload_document` | Upload a document to a project |
| `list_projects` | List your projects and their stats |
| `generate_agent` | Generate a specialized agent from a description |
| `browse_config_library` | Browse curated agent config templates |
| `export_agent` | Re-export a generated agent in a different format |

### Option 3: SaaS Mode

For multi-user deployment with Clerk auth and OpenAI embeddings:

```bash
cp .env.example .env
# Fill in: AUTH_MODE=clerk, CLERK_SECRET_KEY, OPENAI_API_KEY, etc.
npm run dev
```

---

## Using AgentTailor in Large Projects

AgentTailor shines when you have a project with many tasks that each need specialized agents or context. Here's the workflow:

### Step 1: Create a project and upload your docs

```bash
# Via API
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{ "name": "MyApp", "description": "E-commerce platform with React + Express" }'

# Upload your architecture docs, coding standards, schemas, etc.
curl -X POST http://localhost:4000/api/documents/upload \
  -F "file=@./docs/architecture.md" \
  -F "projectId=YOUR_PROJECT_ID"
```

Or just use the Dashboard at http://localhost:5173 to create a project and drag-and-drop your files.

### Step 2: Generate task-specific agents

For each task in your project, generate an agent that knows your codebase AND is specialized for the task:

```bash
# Task: "Implement JWT authentication"
curl -X POST http://localhost:4000/api/agents/generate \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Backend auth engineer",
    "stack": ["express", "typescript", "jwt", "prisma"],
    "domain": "api",
    "description": "Implement JWT-based authentication with refresh tokens, middleware, and Prisma user model",
    "targetFormat": "CLAUDE_AGENT",
    "projectId": "YOUR_PROJECT_ID"
  }'
```

This will:
1. Analyze the requirement and detect relevant domains
2. Search the curated library + web for proven auth configs
3. Score each config on **Specificity** (1-5) + **Relevance** (1-5)
4. Retrieve and compress relevant docs from your project
5. Merge the best configs with your project context
6. Generate a complete agent definition
7. Export in your chosen format (Claude agent `.md`, Cursor `.cursorrules`, or system prompt)
8. Score the result on 4 quality dimensions

### Step 3: Use the generated agent

**Claude Code** — Copy the agent to `.claude/agents/auth-engineer.md` and invoke with `/agents/auth-engineer`

**Cursor** — Save as `.cursorrules` in your project root

**Any LLM** — Use the system prompt format as your AI's system message

### Example: Multi-Task Project Workflow

Imagine you're building a SaaS app with 20 tasks across 5 phases. For each task, you generate a tailored agent:

```
Phase 1: Foundation
  T001: Scaffold monorepo → Agent: scaffold-engineer (node, monorepo, typescript)
  T002: Database schema   → Agent: database-architect (prisma, postgresql, migrations)
  T003: Auth system       → Agent: auth-engineer (jwt, express, middleware)

Phase 2: Core Features
  T004: REST API routes   → Agent: api-developer (express, zod, rest)
  T005: React dashboard   → Agent: frontend-engineer (react, tailwind, react-query)
  T006: File uploads      → Agent: upload-specialist (multer, s3, streaming)

Phase 3: Intelligence
  T007: Search engine     → Agent: search-engineer (elasticsearch, vector-search)
  T008: Recommendations   → Agent: ml-engineer (embeddings, scoring, ranking)
```

Each agent gets:
- **Online proven configs** for its specific stack (discovered from GitHub, curated library)
- **Your project context** — architecture docs, coding standards, existing patterns
- **Task-specific focus** — only the conventions and examples relevant to this task

### Using the MCP Tools for Task-Based Workflow

If you use Claude Code or Claude Desktop, the MCP integration makes this seamless:

```
You: "I need to implement T005 — the React dashboard with project management,
     document uploads, and analytics pages. Generate an agent for this."

Claude (using generate_agent tool):
  → Discovers React + Tailwind + React Query configs
  → Pulls your architecture docs and existing component patterns
  → Generates a frontend-engineer agent with your conventions
  → Returns the agent definition ready to use
```

---

## Assembling Context (Pipeline A)

Beyond agent generation, AgentTailor's original superpower is assembling the perfect context for any AI conversation:

```bash
# "What context does Claude need to help me implement caching?"
curl -X POST http://localhost:4000/api/tailor \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "taskInput": "Implement Redis caching layer for API responses",
    "targetPlatform": "claude",
    "options": {
      "maxTokens": 8000,
      "includeWebSearch": true,
      "includeScore": true
    }
  }'
```

The intelligence engine:
1. **Analyzes** your task — detects domains, complexity, keywords
2. **Retrieves** relevant chunks from your documents via vector search
3. **Detects gaps** — if your docs don't cover Redis, triggers web search
4. **Compresses** — FULL quotes for highly relevant, SUMMARY for medium, KEYWORDS for low
5. **Ranks** by relevance, recency, authority
6. **Formats** for target platform (XML tags for GPT, `<document>` tags for Claude)
7. **Scores** quality: coverage (0.35), relevance (0.30), diversity (0.20), compression (0.15)

The response includes the tailored context, all sources with attribution, token count, and a quality score with suggestions for improvement.

### Chrome Extension

Install the Chrome extension to inject context directly into ChatGPT and Claude conversations. The side panel lets you preview, edit, and control what context gets injected.

### Custom GPT

Use the Custom GPT with OpenAPI Actions to get AgentTailor-powered context inside the GPT Store.

---

## Delivery Platforms

| Platform | How | Status |
|----------|-----|--------|
| **REST API** | `POST /api/tailor` + `POST /api/agents/generate` | v1.2 |
| **MCP Server** | 7 tools for Claude Desktop / Claude Code | v1.2 |
| **Chrome Extension** | Content scripts for chatgpt.com and claude.ai | v1.0 |
| **Dashboard** | React app — projects, documents, agents, analytics | v1.2 |
| **Custom GPT** | GPT Store listing with OpenAPI Actions | v1.0 |
| CLI tool | `agenttailor context "my task"` | Planned |
| VS Code extension | IDE-native context panel | Planned |

---

## Architecture

### Monorepo Structure

```
agenttailor/
├── shared/              # @agenttailor/shared — 26 Zod schemas, types, constants
├── server/              # Express API server (port 4000)
│   ├── prisma/          # PostgreSQL schema (User, Project, Document, Chunk,
│   │                    #   Session, AgentConfig, ConfigTemplate, AgentSession)
│   └── src/
│       ├── routes/              # 15+ API endpoints
│       ├── services/
│       │   ├── intelligence/    # 7-module pipeline (analyze, score, compress...)
│       │   ├── agentOrchestrator.ts   # 10-step agent generation pipeline
│       │   ├── configDiscovery.ts     # Web search for proven configs
│       │   ├── configParser.ts        # Normalize Claude/Cursor/prompt formats
│       │   ├── configScorer.ts        # Specificity + Relevance scoring
│       │   ├── configLibrary.ts       # Curated template index
│       │   ├── agentGenerator.ts      # Merge configs + docs → agent
│       │   ├── formatExporter.ts      # Export to Claude/Cursor/prompt
│       │   └── agentQualityScorer.ts  # 4-dimension quality assessment
│       ├── middleware/          # Auth, rate limiting, plan enforcement
│       └── lib/                 # Redis, token counter, Prisma client
├── dashboard/           # React 18 + Vite + Tailwind (port 5173)
│   └── src/
│       ├── pages/               # 12 pages (projects, docs, agents, analytics...)
│       └── components/          # 30+ components
├── extension/           # Chrome MV3 extension
│   └── src/
│       ├── content/{chatgpt,claude}/  # Platform content scripts
│       ├── sidepanel/                 # Context + Agent builder
│       └── popup/                     # Quick settings
├── mcp-server/          # Claude Desktop / Code integration
│   └── src/tools/       # 7 MCP tools
└── landing/             # Marketing page
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20+, Express, TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM |
| Vector Store | ChromaDB (local) / Pinecone (production) |
| Cache | Redis (ioredis, fail-open) |
| Queue | Bull (async document processing) |
| Dashboard | React 18, Vite, Tailwind CSS, React Query, Recharts |
| Extension | Chrome Manifest V3, React |
| MCP | @modelcontextprotocol/sdk (stdio transport) |
| Auth | Clerk (SaaS) or local mode (no auth) |
| Embeddings | OpenAI ada-002 (SaaS) or @xenova/transformers (local) |
| Validation | Zod (schema-first, inferred types) |
| Web Search | Tavily API + Brave Search fallback |
| Testing | Vitest (162 tests) |

---

## API Reference

### Context Assembly (Pipeline A)

```bash
# Assemble context for a task
POST /api/tailor
{
  "projectId": "...",
  "taskInput": "Implement user authentication with JWT",
  "targetPlatform": "claude",   # or "chatgpt"
  "options": {
    "maxTokens": 8000,
    "includeWebSearch": true,
    "includeScore": true
  }
}
# → { data: { tailoredContext, sources, tokenCount, qualityScore, qualityDetails } }
```

### Agent Factory (Pipeline B)

```bash
# Generate a specialized agent
POST /api/agents/generate
{
  "role": "React component builder",
  "stack": ["react", "typescript", "tailwind"],
  "domain": "web",
  "description": "Build accessible, reusable React components with Tailwind styling",
  "targetFormat": "CLAUDE_AGENT",
  "projectId": "..."              # optional — includes project docs in agent context
}
# → { data: { agent, configSources, qualityScore, session } }

# Quick preview without LLM calls
POST /api/agents/preview
# Same body as /generate → fast estimate of quality and sources

# List your generated agents
GET /api/agents

# Get agent details
GET /api/agents/:id

# Re-export in different format
POST /api/agents/:id/export
{ "format": "CURSOR_RULES" }

# Delete an agent
DELETE /api/agents/:id

# Browse curated config library
GET /api/configs/library?stack=react,typescript&domain=web

# Get config template details
GET /api/configs/library/:id

# Search online for configs (standalone)
POST /api/configs/search
{ "stack": ["react"], "role": "frontend", "domain": "web" }
```

---

## Development

```bash
# Prerequisites: Docker, Node.js 20+

# Start local services
docker compose up -d            # PostgreSQL, Redis, ChromaDB

# Install and build
npm install
npm run build -w shared         # Build shared package first

# Database setup
npx prisma db push --schema=server/prisma/schema.prisma
npx tsx server/prisma/seed.ts

# Seed config library (9 built-in templates)
npx tsx server/src/scripts/seedConfigLibrary.ts

# Start development
npm run dev                     # Server :4000 + Dashboard :5173

# Quality checks
npm run typecheck               # TypeScript across all packages
npm run test                    # 162 tests
npm run lint                    # ESLint
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Good first issues:**
- Add a new embedding provider (Cohere, Voyage AI)
- Add AST-based code chunking for JavaScript/TypeScript
- Add Unity/game-dev config templates to the curated library
- Add Firefox extension support
- Add dark mode to the dashboard
- Improve test coverage for intelligence engine modules

---

## License

[MIT](./LICENSE)
