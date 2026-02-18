# Test MCP Server

Run the full MCP server test suite — unit tests, typecheck, build verification, and optionally interactive testing.

## Input

Optional: test level — `unit` (default), `full` (includes build + typecheck), or `interactive` (launches MCP Inspector)

## Process

### Step 1: Unit Tests
```bash
cd agenttailor && npx vitest run mcp-server/ --reporter verbose
```

Expect all test files to pass:
- `lib/__tests__/zodToJsonSchema.test.ts` — Zod-to-JSON-Schema converter
- `lib/__tests__/apiClient.test.ts` — HTTP client with auth headers
- `tools/__tests__/tailorContext.test.ts` — tailor_context tool handler
- `tools/__tests__/searchDocs.test.ts` — search_docs tool handler
- `tools/__tests__/uploadDocument.test.ts` — upload_document tool handler
- `tools/__tests__/listProjects.test.ts` — list_projects tool handler
- `resources/__tests__/documents.test.ts` — document resource provider
- `resources/__tests__/sessions.test.ts` — session resource provider

### Step 2: Typecheck (if `full` or `interactive`)
```bash
cd agenttailor && npm run typecheck
```

### Step 3: Build (if `full` or `interactive`)
```bash
cd agenttailor && npm run build --workspace=shared && npm run build --workspace=mcp-server
```

### Step 4: MCP Inspector (if `interactive`)

Launch the MCP Inspector for manual testing:
```bash
cd agenttailor && AGENTTAILOR_API_URL=http://localhost:3000 AGENTTAILOR_API_KEY=${API_KEY:-test} npx @modelcontextprotocol/inspector node mcp-server/dist/index.js
```

Then manually verify:
1. **Tools tab**: All 4 tools listed with correct input schemas
2. **Resources tab**: `agenttailor://projects` listed as static resource
3. **Templates tab**: 4 URI templates for documents and sessions
4. **Call `list_projects`**: Returns project list or empty-state message
5. **Call `tailor_context`** with a project ID: Returns assembled context
6. **Read a resource URI**: Returns formatted content

### Test Scenarios for Manual Verification

**Happy path:**
```
list_projects → pick a project ID
search_docs { query: "authentication", projectId: "<id>" }
tailor_context { task: "implement login", projectId: "<id>" }
```

**Error cases:**
```
tailor_context { task: "", projectId: "..." }           → validation error
tailor_context { task: "test", projectId: "not-uuid" }  → validation error
search_docs { query: "x", projectId: "550e8400-e29b-41d4-a716-446655440099" } → API error (not found)
upload_document { ... content: <11MB> }                 → size limit error
```

**Resource browsing:**
```
Read: agenttailor://projects
Read: agenttailor://projects/<id>/documents
Read: agenttailor://projects/<id>/sessions
```

## Output

Test summary with:
- Number of tests passed/failed per file
- Any typecheck errors
- Build success/failure
- Interactive testing notes (if applicable)
