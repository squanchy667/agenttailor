# AgentTailor Workspace Skill

This skill provides context about AgentTailor's project structure, build system, and code organization.

## Project Layout

```
agenttailor/                         # Code repo (this directory)
├── .claude/                         # Claude Code config (agents, commands, skills)
├── shared/                          # @agenttailor/shared
│   └── src/schemas/                 # Zod schemas (THE source of truth for types)
│       ├── project.ts               # Project, CreateProject, UpdateProject
│       ├── document.ts              # Document, Chunk, DocumentStatus
│       ├── tailor.ts                # TailorRequest, TailorResponse, TailorSession
│       ├── task-analysis.ts         # TaskAnalysis, TaskType, KnowledgeDomain
│       ├── scored-chunk.ts          # ScoredChunk, RelevanceScore
│       ├── gap-report.ts            # GapReport, CoverageGap, GapSeverity
│       ├── compressed-context.ts    # CompressedContext, CompressionLevel
│       ├── synthesized-context.ts   # SynthesizedContext, SourceType, Contradiction
│       ├── token-budget.ts          # TokenBudget, ModelConfig, BudgetAllocation
│       ├── web-search.ts            # WebSearchResult, SearchProvider
│       ├── quality-score.ts         # QualityScore, QualityReport
│       ├── plan.ts                  # PlanTier, PlanLimits, RateLimitInfo
│       └── index.ts                 # Barrel exports
├── server/                          # Express API server
│   ├── prisma/schema.prisma         # Database schema
│   └── src/
│       ├── routes/                  # API endpoints
│       │   ├── index.ts             # Route registration
│       │   ├── auth.ts              # /api/auth/*
│       │   ├── projects.ts          # /api/projects/*
│       │   ├── documents.ts         # /api/projects/:id/documents/*
│       │   ├── tailor.ts            # /api/tailor/* (THE CORE endpoint)
│       │   ├── search.ts            # /api/search/*
│       │   ├── settings.ts          # /api/settings
│       │   ├── analytics.ts         # /api/analytics
│       │   ├── gptActions.ts        # /gpt/* (GPT Store Actions)
│       │   └── health.ts            # /api/health
│       ├── services/intelligence/   # Context Intelligence Engine
│       │   ├── task-analyzer.ts     # Classify task → domains, type, complexity
│       │   ├── relevance-scorer.ts  # Two-stage: bi-encoder → cross-encoder reranking
│       │   ├── gap-detector.ts      # Find coverage gaps, trigger web search
│       │   ├── context-compressor.ts # Hierarchical compression (FULL→SUMMARY→KEYWORDS→REFERENCE)
│       │   ├── source-synthesizer.ts # Dedup, contradiction detection, section grouping
│       │   ├── context-window-manager.ts # Token counting, model limits, budget allocation
│       │   ├── tailor-orchestrator.ts    # Full pipeline orchestration
│       │   └── platform-formatter.ts     # GPT (XML) vs Claude (Markdown+document tags)
│       ├── services/chunking/       # Semantic document chunking
│       ├── services/embedding/      # OpenAI ada-002 embeddings
│       ├── services/vectorStore/    # ChromaDB/Pinecone adapters
│       ├── services/search/         # Web search (Tavily/Brave)
│       ├── services/textExtractor/  # PDF, DOCX, MD, TXT, code extraction
│       ├── middleware/              # auth, validateRequest, rateLimiter, planEnforcer
│       ├── workers/                 # Bull queue workers for async doc processing
│       └── lib/                     # Utilities (tokenCounter, redis)
├── dashboard/src/                   # React dashboard
│   ├── components/ui/               # Button, Input, Card, Modal, Spinner, Badge, Toast, Skeleton
│   ├── components/layout/           # AppLayout, Sidebar, Header
│   ├── components/projects/         # ProjectCard, ProjectForm
│   ├── components/documents/        # DocumentUploader, DocumentList, ProcessingProgress
│   ├── components/tailoring/        # TailorForm, ContextViewer, SourceCard, SessionHistory
│   ├── components/analytics/        # UsageChart, QualityTrend, ProjectStats
│   ├── components/settings/         # ApiKeyManager, ContextPreferences
│   ├── pages/                       # Route page components
│   ├── hooks/                       # Custom React hooks (useProjects, useTailor, etc.)
│   └── lib/                         # API client, React Query provider
├── extension/src/                   # Chrome extension (Manifest V3)
│   ├── background/                  # Service worker (message routing, API bridge)
│   ├── content/chatgpt/             # ChatGPT DOM detection and injection
│   ├── content/claude/              # Claude DOM detection and injection
│   ├── sidepanel/{components,hooks}/ # Context preview, source list, editable context
│   └── popup/{components,hooks}/    # Project selector, quick settings
├── mcp-server/src/                  # MCP server for Claude Desktop
│   ├── tools/                       # tailor_context, search_docs, upload_document
│   └── resources/                   # Document and session resource providers
└── landing/                         # Marketing landing page (React + Vite + Tailwind)

../agenttailor-docs/                 # Docs repo (sibling directory)
├── PLAN.md                          # Master plan with architecture and phases
├── TASK_BOARD.md                    # All 40 tasks with dependencies and status
├── tasks/phase-{1-8}/              # Individual task specs (T001-T040)
└── development-agents.md            # Agent strategy and batch execution plan
```

## Build Order

1. `shared` — Zod schemas and types (no dependencies)
2. `server` — Express API (depends on shared)
3. `dashboard` — React app (depends on shared, calls server API)
4. `extension` — Chrome extension (depends on shared, calls server API)
5. `mcp-server` — MCP server (depends on shared, calls server services)
6. `landing` — Landing page (standalone)

## Key Commands

```bash
npm run dev          # Start server (port 4000) + dashboard (port 5173) concurrently
npm run build        # Build all packages in dependency order
npm run typecheck    # tsc --noEmit across all packages (composite build)
npm run test         # vitest run (all packages)
npm run test:server  # Server tests only
npm run test:dashboard # Dashboard tests only
npm run lint         # ESLint across all packages
docker compose up -d # Start PostgreSQL (5432), Redis (6379), ChromaDB (8000)
npx prisma migrate dev  # Run database migrations
npx prisma studio       # Open database GUI
```

## Adding New Code

### New Zod Schema
1. Create `shared/src/schemas/{name}.ts`
2. Export from `shared/src/schemas/index.ts`
3. Run `npm run typecheck` to verify

### New API Route
1. Create `server/src/routes/{resource}.ts`
2. Register in `server/src/routes/index.ts`
3. Add Zod schemas in shared if needed
4. Write tests in `server/src/routes/__tests__/{resource}.test.ts`

### New React Component
1. Create `dashboard/src/components/{category}/{ComponentName}.tsx`
2. Add hook in `dashboard/src/hooks/` if it fetches data
3. Add to appropriate page in `dashboard/src/pages/`

### New Intelligence Module
1. Create schema in `shared/src/schemas/`
2. Create service in `server/src/services/intelligence/`
3. Write tests adjacent: `server/src/services/intelligence/{name}.test.ts`
4. Wire into `tailor-orchestrator.ts` if it's a pipeline stage
