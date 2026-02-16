# AgentTailor

Cross-platform AI agent tailoring add-on for ChatGPT and Claude

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Validation:** Zod
- **Testing:** Vitest

## Getting Started

```bash
npm install
npm run dev
```

## Structure

```
agenttailor/
├── client/          # React frontend (Vite)
├── server/          # Express backend
│   └── src/
│       ├── routes/  # API route handlers
│       ├── services/ # Business logic
│       └── middleware/
├── shared/          # Shared types and schemas
└── package.json     # Workspace root
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build all packages |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run lint` | Lint code |
