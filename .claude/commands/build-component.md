# Build Component

Scaffold a React component following AgentTailor's frontend conventions.

## Input

Component name: $ARGUMENTS (e.g., UserProfile, DocumentList, QualityBadge)

## Process

### 1. Understand Requirements
If just a name is given, infer the component's purpose from its name and context. If a description is also provided, use that.

### 2. Explore Existing Patterns
Read existing components in `dashboard/src/components/` to understand:
- File structure (functional components, hooks usage)
- Tailwind CSS patterns used
- Import conventions
- How components handle loading/error/empty states

### 3. Scaffold the Component

Determine the right directory:
- UI primitives → `dashboard/src/components/ui/`
- Layout → `dashboard/src/components/layout/`
- Project features → `dashboard/src/components/projects/`
- Document features → `dashboard/src/components/documents/`
- Tailoring features → `dashboard/src/components/tailoring/`
- Analytics features → `dashboard/src/components/analytics/`
- Settings features → `dashboard/src/components/settings/`

Create `dashboard/src/components/{category}/{ComponentName}.tsx`:

```tsx
import type { FC } from 'react';

export interface {ComponentName}Props {
  // Props here
}

export const {ComponentName}: FC<{ComponentName}Props> = ({ /* props */ }) => {
  return (
    <div className="...">
      {/* Implementation */}
    </div>
  );
};
```

### 4. Add Data Fetching (if needed)
For components that fetch data, create a hook in `dashboard/src/hooks/`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function use{Resource}(id: string) {
  return useQuery({
    queryKey: ['{resource}', id],
    queryFn: () => apiClient.get<{Resource}Response>(`/api/{resource}/${id}`),
  });
}
```

### 5. Handle States
Every component that fetches data must handle:
```tsx
if (isLoading) return <Skeleton variant="card" />;
if (error) return <ErrorBanner message={error.message} onRetry={refetch} />;
if (!data || data.length === 0) return <EmptyState message="No items yet" action={<Button>Create</Button>} />;
```

### 6. Conventions
- Functional components with named exports (not default)
- Props interface named `{ComponentName}Props`
- Tailwind CSS for all styling — no CSS modules or styled-components
- Accessible: aria labels, keyboard navigation, semantic HTML
- React Query for server state, useState/useReducer for local state
- Forms: react-hook-form + @hookform/resolvers/zod

## Output
- The component file
- Hook file (if data fetching needed)
- Note on where to integrate it in the app (which page/route)
