# AgentTailor — Project Conventions

## What This Is
Cross-platform context assembly platform that makes AI agents (ChatGPT and Claude) better by automatically assembling optimal context from documents and web search.

## Stack
- **Runtime**: Node.js 20+ / TypeScript 5.x (ES2022, NodeNext modules)
- **Backend**: Express.js
- **Database**: PostgreSQL (Prisma ORM)
- **Vector Storage**: ChromaDB (local) / Pinecone (production)
- **Cache/Queue**: Redis + Bull
- **Dashboard**: React 18+ / Vite / Tailwind CSS
- **Extension**: Chrome Manifest V3 (CRXJS + Vite)
- **MCP Server**: @modelcontextprotocol/sdk (stdio transport)
- **Auth**: Clerk (@clerk/express, @clerk/clerk-react)
- **Validation**: Zod → inferred types (never hand-write interfaces for validated data)
- **Embeddings**: OpenAI text-embedding-ada-002
- **Web Search**: Tavily API (primary), Brave Search (fallback)
- **Testing**: Vitest, React Testing Library, Supertest, Playwright

## Monorepo Structure
```
agenttailor/
├── shared/          # @agenttailor/shared — Zod schemas, types, constants
├── server/          # Express API server
│   ├── prisma/      # PostgreSQL schema + migrations
│   └── src/
│       ├── routes/          # Express route handlers
│       ├── services/        # Business logic
│       │   ├── intelligence/ # THE CORE — task analyzer, scorer, compressor, synthesizer, window manager, orchestrator
│       │   ├── chunking/    # Semantic document chunking
│       │   ├── embedding/   # OpenAI embedding generation
│       │   ├── vectorStore/ # ChromaDB/Pinecone adapters
│       │   ├── search/      # Web search (Tavily/Brave)
│       │   └── textExtractor/ # PDF, DOCX, MD, TXT, code
│       ├── middleware/      # auth, validateRequest, rateLimiter, planEnforcer
│       ├── workers/         # Bull queue workers
│       └── lib/             # tokenCounter, redis client
├── dashboard/       # React dashboard
│   └── src/
│       ├── components/{ui,layout,projects,documents,tailoring,analytics,settings}/
│       ├── pages/
│       ├── hooks/
│       └── lib/             # API client, React Query setup
├── extension/       # Chrome extension
│   └── src/
│       ├── background/      # Service worker
│       ├── content/{chatgpt,claude}/ # Platform content scripts
│       ├── sidepanel/       # Context preview panel
│       └── popup/           # Quick settings
├── mcp-server/      # Claude Desktop MCP integration
│   └── src/{tools,resources}/
└── landing/         # Marketing landing page
```

**Build order**: shared → server → dashboard / extension / mcp-server / landing

## Key Patterns

### Imports
- Use `@agenttailor/shared` package imports for shared code
- Use explicit `type` keyword for type-only imports: `import type { Foo } from '...'`
- Use barrel exports (`index.ts`) — no deep sub-path imports

### Validation (Zod-first)
- Define Zod schema first, infer type: `type Project = z.infer<typeof ProjectSchema>`
- Validate at system boundaries (API input, config loading, external data)
- Internal code trusts validated data — no redundant checks
- Schemas live in `shared/src/schemas/`

### API Routes
- Express Router with auth middleware: `router.get('/', auth, handler)`
- Validation middleware: `validateRequest(CreateProjectSchema, 'body')`
- Standard response: `{ data: T }` success, `{ error: { code, message, details? } }` error
- Middleware stack: json → cors → auth → rateLimiter → validateRequest → handler → errorHandler

### Intelligence Engine (THE CORE)
- Pipeline: analyze → budget → retrieve → gaps → (web search) → compress → synthesize → format
- Each module is an independent service with its own Zod schemas
- Graceful degradation: partial results on intermediate failures, never return nothing
- Platform-specific formatting: XML tags for GPT, Markdown + `<document>` tags for Claude

### React Components
- Functional components with named exports
- Props interface: `{ComponentName}Props`
- Tailwind CSS for all styling
- React Query for server state
- Handle loading, error, and empty states

### Extension
- Chrome storage API for persistent settings
- chrome.runtime messages for inter-component communication
- MutationObserver for SPA navigation detection

## Commands
```bash
npm run dev          # Start server + dashboard concurrently
npm run build        # Build all workspaces in order
npm run typecheck    # tsc --noEmit across all packages
npm run test         # vitest run
npm run lint         # eslint
docker compose up -d # Start PostgreSQL, Redis, ChromaDB
```

## File Naming
- Source: `kebab-case.ts` (e.g., `task-analyzer.ts`, `relevance-scorer.ts`)
- Tests: `*.test.ts` adjacent to source
- React components: `PascalCase.tsx` (e.g., `ProjectCard.tsx`)
- Schemas: `kebab-case.ts` in `shared/src/schemas/`

## Git Conventions
- Branch: `feat/TXXX-task-name` (e.g., `feat/T001-monorepo-scaffold`)
- Commit: `[Phase X] TXXX: Brief description`
- Task statuses: PENDING → IN_PROGRESS → IN_REVIEW → DONE
