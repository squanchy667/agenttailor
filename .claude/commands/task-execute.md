# Task Execute

Execute a task from the AgentTailor task board autonomously.

## Input

Task ID: $ARGUMENTS (e.g., T001, T014)

## Process

### 1. Load Task Spec
Read the task specification from the docs repo:
- Phase 1: `../agenttailor-docs/tasks/phase-1/T0XX-*.md`
- Phase 2: `../agenttailor-docs/tasks/phase-2/T0XX-*.md`
- Phase 3: `../agenttailor-docs/tasks/phase-3/T0XX-*.md`
- Phase 4: `../agenttailor-docs/tasks/phase-4/T0XX-*.md`
- Phase 5: `../agenttailor-docs/tasks/phase-5/T0XX-*.md`
- Phase 6: `../agenttailor-docs/tasks/phase-6/T0XX-*.md`
- Phase 7: `../agenttailor-docs/tasks/phase-7/T0XX-*.md`
- Phase 8: `../agenttailor-docs/tasks/phase-8/T0XX-*.md`

### 2. Check Dependencies
Read `../agenttailor-docs/TASK_BOARD.md` and verify all "Depends On" tasks are marked DONE. If any are not, report which dependencies are missing and stop.

### 3. Understand Context
- Read the architecture docs referenced in the task
- Read existing code files that will be modified
- Read related files to understand patterns in use
- Read `shared/src/schemas/` for relevant Zod schemas

### 4. Plan Implementation
Before writing any code:
- List all files to create/modify
- Identify the build sequence (what to implement first)
- Note any decisions that need user input

### 5. Execute
Implement the task following AgentTailor conventions:
- Zod schemas first (in `shared/src/schemas/`), then service logic, then routes/components
- Use `@agenttailor/shared` for cross-package imports
- Validate at API boundaries with `validateRequest` middleware
- Write tests adjacent to source: `*.test.ts`
- Standard response format: `{ data }` success, `{ error: { code, message } }` error

### 6. Verify
```bash
npm run typecheck    # Must pass — no type errors
npm run test         # Must pass — all tests green
npm run lint         # Must pass — no lint errors
```

### 7. Report
Output a summary:
- What was implemented
- Files created/modified
- Any decisions made
- What to test manually
- Suggested next steps

## Important
- Always read the full task spec before starting
- Follow the acceptance criteria exactly
- Don't modify files outside the task's scope
- Create a git branch: `feat/{task-id}-{short-name}` (e.g., `feat/T001-scaffold`)
- Commit with: `[Phase X] TXXX: Brief description`
