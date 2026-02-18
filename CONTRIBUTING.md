# Contributing to AgentTailor

Thanks for your interest in contributing to AgentTailor! This guide will help you get started.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/agenttailor.git
cd agenttailor

# Install dependencies
npm install

# Start local services (PostgreSQL, Redis, ChromaDB)
docker compose up -d

# Set up environment
cp .env.example .env
# Edit .env with your API keys (at minimum: CLERK keys + OPENAI_API_KEY)

# Run database migrations
npx prisma migrate dev --schema=server/prisma/schema.prisma

# Start development
npm run dev
```

The server runs at http://localhost:4000 and the dashboard at http://localhost:5173.

## Project Structure

```
agenttailor/
├── shared/       # Zod schemas, types, constants (build first)
├── server/       # Express API server
├── dashboard/    # React dashboard
├── extension/    # Chrome browser extension
├── mcp-server/   # Claude Desktop MCP integration
└── landing/      # Marketing landing page
```

**Build order**: `shared` must build before all other packages.

## Development Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run checks: `npm run typecheck && npm run test && npm run lint`
4. Commit with a descriptive message
5. Open a pull request

## Code Conventions

### TypeScript
- Zod-first validation: define Zod schema, infer TypeScript type
- Use `import type { ... }` for type-only imports
- Schemas live in `shared/src/schemas/`
- No `any` types — use `unknown` and narrow

### React
- Functional components with named exports
- Tailwind CSS for all styling
- React Query for server state
- Handle loading, error, and empty states

### API Routes
- Express Router with auth middleware
- Validate request body with `validateRequest(Schema, 'body')`
- Standard response: `{ data: T }` for success, `{ error: { code, message } }` for errors

### Testing
- Vitest for all tests
- Tests live adjacent to source files (`*.test.ts`)
- Test both valid and invalid inputs for schemas
- Test edge cases (empty arrays, boundary values)

## Good First Issues

Looking for something to work on? These are great starting points:

- **Add a new embedding provider** — Implement the vector store adapter interface for Cohere or Voyage AI
- **Add a new search provider** — Add a search client alongside Tavily/Brave
- **Improve code chunking** — Add AST-based splitting for JavaScript/TypeScript (see TODO in `server/src/services/chunking/chunk-engine.ts`)
- **Firefox extension** — Port the Chrome extension to WebExtensions API
- **Dark mode** — Add dark mode toggle to the dashboard
- **i18n** — Add internationalization framework
- **More tests** — Increase coverage for intelligence engine modules

## Architecture Decisions

### Why Zod-first?
Every shared type starts as a Zod schema. This gives us runtime validation and TypeScript types from a single source of truth. No type drift between packages.

### Why ChromaDB + Pinecone?
Adapter pattern: ChromaDB for local development (zero config), Pinecone for production (managed, scalable). The interface is the same — swap via env var.

### Why Redis fail-open?
Rate limiting uses Redis, but if Redis is down, requests pass through. Availability over correctness for non-critical operations. Users should never be blocked by a cache outage.

### Why separate content scripts per platform?
ChatGPT uses ProseMirror, Claude uses contenteditable. The DOM structures, injection methods, and event handling are completely different. Separate modules keep the code clean.

## Reporting Issues

- Use GitHub Issues for bugs and feature requests
- Include steps to reproduce for bugs
- Include your Node.js version, OS, and browser version where relevant

## Code of Conduct

Be respectful, constructive, and inclusive. We're building something useful together.
