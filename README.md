# AgentTailor

Cross-platform AI agent tailoring add-on for ChatGPT and Claude

## Stack

- **Runtime:** Node.js 20+ / TypeScript 5.x
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Vector Storage:** ChromaDB (local) / Pinecone (production)
- **Cache/Queue:** Redis + Bull
- **Dashboard:** React 18 + Vite + Tailwind CSS
- **Extension:** Chrome Manifest V3
- **MCP Server:** @modelcontextprotocol/sdk
- **Validation:** Zod
- **Testing:** Vitest

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Services

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, and ChromaDB.

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Start Development

```bash
npm run dev
```

This runs the server (port 4000) and dashboard (port 5173) concurrently.

## Monorepo Structure

```
agenttailor/
├── shared/          # @agenttailor/shared — Zod schemas, types, constants
├── server/          # Express API server (port 4000)
├── dashboard/       # React dashboard (port 5173)
├── extension/       # Chrome extension
├── mcp-server/      # Claude Desktop MCP integration
├── landing/         # Marketing landing page (port 3000)
├── docker-compose.yml
├── package.json     # Workspace root
└── tsconfig.base.json
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server + dashboard concurrently |
| `npm run build` | Build all packages in order |
| `npm run typecheck` | TypeScript type checking across all packages |
| `npm run test` | Run tests across all packages |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `docker compose up -d` | Start PostgreSQL, Redis, ChromaDB |

## Package Scripts

Each package has its own scripts:

```bash
npm run dev -w server      # Start server only
npm run dev -w dashboard   # Start dashboard only
npm run build -w shared    # Build shared package
npm run test -w server     # Test server only
```

## Development Workflow

1. Make changes to shared types/schemas in `shared/src/`
2. Implement backend logic in `server/src/`
3. Build UI components in `dashboard/src/`
4. The dashboard proxies API requests to the server
5. Run `npm run typecheck` to verify TypeScript across all packages

## Services

- **Server:** http://localhost:4000
- **Dashboard:** http://localhost:5173
- **Landing:** http://localhost:3000
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **ChromaDB:** http://localhost:8000
