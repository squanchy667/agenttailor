# AgentTailor Conventions Skill

This skill provides context about AgentTailor's coding patterns and conventions. Use this knowledge whenever working on the codebase.

## Validation Approach

Zod-first: define schema, infer type. Never hand-write interfaces for validated data.

```typescript
// In shared/src/schemas/
import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
```

Validate at system boundaries only (API input, config loading, external data). Internal code trusts validated data.

## Import Conventions

- Cross-package: `import { ProjectSchema } from '@agenttailor/shared'`
- Type-only: `import type { Project } from '@agenttailor/shared'`
- Barrel exports: import from `index.ts`, not from deep paths
- No relative imports across package boundaries

## Error Handling

API routes use a standard error format:
```typescript
// Success
res.json({ data: result });

// Error
res.status(400).json({
  error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: zodErrors }
});

// Error codes
// VALIDATION_ERROR (400), NOT_FOUND (404), UNAUTHORIZED (401),
// RATE_LIMIT_EXCEEDED (429), INTERNAL_ERROR (500)
```

Intelligence engine services use graceful degradation — return partial results on intermediate failures, never return nothing.

## File Naming

- Source files: `kebab-case.ts` (e.g., `task-analyzer.ts`, `gap-detector.ts`)
- React components: `PascalCase.tsx` (e.g., `ProjectCard.tsx`, `ContextViewer.tsx`)
- Tests: `*.test.ts` adjacent to source (e.g., `task-analyzer.test.ts`)
- Schemas: `kebab-case.ts` in `shared/src/schemas/` (e.g., `tailor.ts`, `project.ts`)

## Key Patterns

### Express Route Pattern
```typescript
router.post('/', auth, validateRequest(CreateSchema, 'body'), async (req, res) => {
  const body = req.body; // Already validated by middleware
  const result = await service.create(req.auth.userId, body);
  res.status(201).json({ data: result });
});
```

### React Component Pattern
```tsx
export interface ProjectCardProps {
  project: ProjectResponse;
  onDelete?: (id: string) => void;
}

export const ProjectCard: FC<ProjectCardProps> = ({ project, onDelete }) => {
  return (
    <div className="rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">{project.name}</h3>
      {/* ... */}
    </div>
  );
};
```

### React Query Hook Pattern
```tsx
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<ProjectResponse[]>('/api/projects'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => apiClient.post('/api/projects', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}
```

### Intelligence Service Pattern
Each intelligence module follows: Zod schema → service function → unit tests.
```typescript
// Schema in shared/src/schemas/
export const TaskAnalysisSchema = z.object({ /* ... */ });
export type TaskAnalysis = z.infer<typeof TaskAnalysisSchema>;

// Service in server/src/services/intelligence/
export async function analyzeTask(input: string): Promise<TaskAnalysis> { /* ... */ }

// Test adjacent
describe('analyzeTask', () => { it('should classify coding tasks', () => { /* ... */ }); });
```
