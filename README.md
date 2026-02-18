# AgentTailor

**Make AI agents dramatically better by automatically assembling the optimal context.**

AgentTailor analyzes your task, retrieves relevant information from your documents and the web, compresses and ranks it intelligently, and injects a tailored context package into ChatGPT, Claude, or any AI agent — so you get better answers without manual prompt engineering.

## Why AgentTailor?

| Problem | AgentTailor Solution |
|---------|---------------------|
| Manually copy-pasting from docs into AI chats | Automatic document ingestion + semantic search |
| AI doesn't know your codebase/domain | Upload docs once, context is assembled per task |
| Token limits waste budget on irrelevant info | Hierarchical compression keeps only what matters |
| Different AI platforms need different formats | Cross-platform delivery (ChatGPT, Claude, GPT Store, MCP) |
| No visibility into what context was used | Full transparency with quality scores and source attribution |

## How It Works

```
Your Task → AgentTailor Intelligence Engine → Tailored Context → AI Agent
                    │
                    ├── Analyze task domains and complexity
                    ├── Retrieve relevant chunks from your documents
                    ├── Detect gaps → trigger web search if needed
                    ├── Compress: exact quotes / summaries / keywords
                    ├── Rank by relevance, recency, authority
                    ├── Fit to model's token budget
                    ├── Format for target platform (GPT vs Claude)
                    └── Score quality (coverage, diversity, relevance)
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/agenttailor.git
cd agenttailor
npm install

# Start local services (PostgreSQL, Redis, ChromaDB)
docker compose up -d

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npx prisma migrate dev --schema=server/prisma/schema.prisma

# Start development
npm run dev
```

The server runs at http://localhost:4000 and the dashboard at http://localhost:5173.

## Delivery Platforms

| Platform | How | Status |
|----------|-----|--------|
| **Chrome Extension** | Content scripts for chatgpt.com and claude.ai with side panel | v1.0 |
| **MCP Server** | Native Claude Desktop/Code integration (4 tools, 2 resource providers) | v1.0 |
| **Custom GPT** | GPT Store listing with OpenAPI Actions | v1.0 |
| **REST API** | `POST /api/tailor` for any integration | v1.0 |
| **Dashboard** | React app for project management, uploads, analytics | v1.0 |
| CLI tool | `agenttailor context "my task"` | Planned |
| VS Code extension | IDE-native context panel | Planned |

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20+, Express.js, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Vector Storage | ChromaDB (local) / Pinecone (production) |
| Cache | Redis (ioredis) |
| Queue | Bull (async document processing) |
| Dashboard | React 18, Vite, Tailwind CSS, React Query, Recharts |
| Extension | Chrome Manifest V3, React side panel |
| MCP Server | @modelcontextprotocol/sdk |
| Auth | Clerk |
| Validation | Zod (schema-first, inferred types) |
| Testing | Vitest (38 tests) |
| CI/CD | GitHub Actions, Docker, Railway |

## Monorepo Structure

```
agenttailor/
├── shared/          # @agenttailor/shared — Zod schemas, types, constants
├── server/          # Express API server (port 4000)
│   ├── prisma/      # Database schema + migrations
│   └── src/
│       ├── routes/          # API endpoints
│       ├── services/        # Intelligence engine, document processing
│       ├── middleware/      # Auth, rate limiting, plan enforcement
│       └── lib/             # Redis client, token counter
├── dashboard/       # React dashboard (port 5173)
│   └── src/
│       ├── pages/           # 9 pages
│       ├── components/      # 25+ components
│       └── hooks/           # React Query hooks
├── extension/       # Chrome extension
│   └── src/
│       ├── background/      # Service worker + tailor bridge
│       ├── content/         # ChatGPT + Claude content scripts
│       ├── sidepanel/       # Context preview panel
│       └── popup/           # Quick settings
├── mcp-server/      # Claude Desktop MCP integration
│   └── src/
│       ├── tools/           # tailor_context, search_docs, upload_document, list_projects
│       └── resources/       # Document + session resource providers
├── landing/         # Marketing landing page (port 3000)
├── docker-compose.yml       # Local dev services
├── docker-compose.prod.yml  # Production deployment
├── Dockerfile               # Multi-stage production build
└── .github/workflows/ci.yml # CI pipeline
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server + dashboard concurrently |
| `npm run build` | Build all packages in dependency order |
| `npm run typecheck` | TypeScript checking across all packages |
| `npm run test` | Run all 38 tests |
| `npm run lint` | ESLint across all packages |
| `docker compose up -d` | Start PostgreSQL, Redis, ChromaDB |

## API Example

```bash
curl -X POST http://localhost:4000/api/tailor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId": "your-project-id",
    "taskInput": "Implement user authentication with JWT",
    "targetPlatform": "claude",
    "options": {
      "maxTokens": 8000,
      "includeWebSearch": true,
      "includeScore": true
    }
  }'
```

Response includes `tailoredContext`, `sources`, `tokenCount`, `qualityScore`, and `qualityDetails`.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Good first issues:**
- Add a new embedding provider (Cohere, Voyage AI)
- Add AST-based code chunking for JavaScript/TypeScript
- Add Firefox extension support
- Add dark mode to the dashboard
- Increase test coverage

## License

[MIT](./LICENSE)
