import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton to prevent multiple instances in development with hot reload.
 * Uses globalThis to persist the client across module reloads.
 */

// Extend NodeJS global type to include our prisma instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a new PrismaClient instance or reuse the existing one
export const prisma = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// In development, store the client on globalThis to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
