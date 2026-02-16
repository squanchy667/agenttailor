# Design Schema

Design a Zod schema following AgentTailor's validation conventions.

## Input

Schema name: $ARGUMENTS (e.g., TailorRequest, ProjectConfig, QualityScore)

## Process

### 1. Understand Requirements
Determine from the name and context:
- What data this schema validates
- Where it will be used (API input, service output, database record, etc.)
- Related existing schemas to reference

### 2. Explore Existing Patterns
Read existing schemas in `shared/src/schemas/` to understand:
- Schema definition patterns (z.object, z.enum, z.union)
- Type inference approach (z.infer)
- Naming conventions (Schema suffix, Input/Response suffixes for types)
- Common validators (z.string().uuid(), z.string().min(1).max(255))

### 3. Design the Schema

Create `shared/src/schemas/{schema-name}.ts`:

```typescript
import { z } from 'zod';

// Input schema (for API request validation)
export const Create{Name}Schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  // ... fields
});
export type Create{Name}Input = z.infer<typeof Create{Name}Schema>;

// Response schema (for API response typing)
export const {Name}ResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type {Name}Response = z.infer<typeof {Name}ResponseSchema>;

// Update schema (partial of create)
export const Update{Name}Schema = Create{Name}Schema.partial();
export type Update{Name}Input = z.infer<typeof Update{Name}Schema>;
```

### 4. Export
Add to barrel exports in `shared/src/schemas/index.ts`:
```typescript
export * from './{schema-name}';
```

### 5. Conventions
- Zod schema is the single source of truth — never hand-write interfaces for validated data
- Use `.transform()` for data normalization (trim strings, lowercase emails)
- Use `.refine()` for complex cross-field validation
- Common patterns:
  - IDs: `z.string().uuid()`
  - Names: `z.string().min(1).max(255)`
  - Descriptions: `z.string().max(2000).optional()`
  - Timestamps: `z.string().datetime()` or `z.date()`
  - Enums: `z.enum(['VALUE_A', 'VALUE_B'])` (uppercase)
  - Pagination: `z.object({ page: z.coerce.number().min(1).default(1), limit: z.coerce.number().min(1).max(100).default(20) })`
- Name schemas with `Schema` suffix, types without
- Input types: `Create{Name}Input`, `Update{Name}Input`
- Response types: `{Name}Response`

## Output
- The schema definition file
- Updated barrel exports
- Note on where this schema should be used for validation
