# Build Route

Scaffold an Express API route following AgentTailor's backend conventions.

## Input

Route path: $ARGUMENTS (e.g., /api/users, /api/projects/:id/documents)

## Process

### 1. Understand Requirements
Parse the route path to determine:
- Resource name (e.g., "users", "projects", "documents")
- Whether it's a collection or individual resource route
- Required HTTP methods (GET, POST, PUT, DELETE)

### 2. Explore Existing Patterns
Read existing routes in `server/src/routes/` to understand:
- Router setup and export patterns
- Middleware usage (auth, validateRequest)
- Error handling approach
- Response format

### 3. Scaffold the Route

Create `server/src/routes/{resource}.ts` with:

```typescript
import { Router } from 'express';
import type { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { Create{Resource}Schema, Update{Resource}Schema } from '@agenttailor/shared';

const router = Router();

// GET / — List resources
router.get('/', auth, async (req: Request, res: Response) => {
  const userId = req.auth.userId;
  // Implementation
  res.json({ data: results });
});

// GET /:id — Get single resource
router.get('/:id', auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  // Implementation
  res.json({ data: result });
});

// POST / — Create resource
router.post('/', auth, validateRequest(Create{Resource}Schema, 'body'), async (req: Request, res: Response) => {
  const body = req.body;
  // Implementation
  res.status(201).json({ data: created });
});

// PUT /:id — Update resource
router.put('/:id', auth, validateRequest(Update{Resource}Schema, 'body'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  // Implementation
  res.json({ data: updated });
});

// DELETE /:id — Delete resource
router.delete('/:id', auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  // Implementation
  res.status(204).send();
});

export { router as {resource}Router };
```

### 4. Create Zod Schemas
If they don't exist, create schemas in `shared/src/schemas/{resource}.ts`:
```typescript
import { z } from 'zod';

export const Create{Resource}Schema = z.object({ /* fields */ });
export type Create{Resource}Input = z.infer<typeof Create{Resource}Schema>;

export const {Resource}ResponseSchema = z.object({ /* fields */ });
export type {Resource}Response = z.infer<typeof {Resource}ResponseSchema>;
```

### 5. Register the Route
Add to `server/src/routes/index.ts`:
```typescript
import { {resource}Router } from './{resource}';
router.use('/api/{resource}', {resource}Router);
```

### 6. Conventions
- Auth middleware on all routes (except health)
- Zod validation via `validateRequest(schema, 'body' | 'query' | 'params')`
- Response format: `{ data: T }` success, `{ error: { code, message } }` error
- Error codes: VALIDATION_ERROR (400), NOT_FOUND (404), UNAUTHORIZED (401), INTERNAL_ERROR (500)
- Pagination: `?page=1&limit=20` with `{ data, pagination: { page, limit, total } }`

## Output
- The route file
- Zod schemas (if created)
- Updated route registration
- Note on what service/data layer is needed
