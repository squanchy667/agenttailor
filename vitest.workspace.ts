import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'shared/vitest.config.ts',
  'server/vitest.config.ts',
  'dashboard/vitest.config.ts',
  'extension/vitest.config.ts',
  'mcp-server/vitest.config.ts',
  'landing/vitest.config.ts',
]);
