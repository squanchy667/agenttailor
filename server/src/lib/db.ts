import { prisma } from './prisma.js';
import type { Plan, DocumentStatus, Prisma } from '@prisma/client';

/**
 * Typed helper functions for common database operations.
 * These provide a type-safe, convenient API layer over Prisma queries.
 */

// User operations

export async function findUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(data: {
  email: string;
  clerkId: string;
  name?: string;
  plan?: Plan;
}) {
  return prisma.user.create({
    data,
  });
}

export async function updateUserPlan(userId: string, plan: Plan) {
  return prisma.user.update({
    where: { id: userId },
    data: { plan },
  });
}

export async function updateUserSettings(userId: string, settings: Prisma.InputJsonValue) {
  return prisma.user.update({
    where: { id: userId },
    data: { settings },
  });
}

// Project operations

export async function getProjectWithDocCount(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      _count: {
        select: {
          documents: true,
        },
      },
    },
  });
}

export async function listUserProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          documents: true,
          tailoringSessions: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

export async function createProject(data: {
  userId: string;
  name: string;
  description?: string;
}) {
  return prisma.project.create({
    data,
  });
}

export async function deleteProject(projectId: string, userId: string) {
  // Cascade delete will handle documents, chunks, and sessions
  return prisma.project.deleteMany({
    where: {
      id: projectId,
      userId,
    },
  });
}

// Document operations

export async function getDocumentWithChunks(documentId: string, projectId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
    },
    include: {
      chunks: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });
}

export async function listProjectDocuments(projectId: string) {
  return prisma.document.findMany({
    where: { projectId },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  chunkCount?: number
) {
  return prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      ...(chunkCount !== undefined && { chunkCount }),
    },
  });
}

// Chunk operations

export async function createChunks(
  documentId: string,
  chunks: Array<{
    content: string;
    position: number;
    metadata?: Prisma.InputJsonValue;
    tokenCount: number;
  }>
) {
  return prisma.chunk.createMany({
    data: chunks.map(chunk => ({
      documentId,
      ...chunk,
    })),
  });
}

export async function getDocumentChunks(documentId: string, limit?: number) {
  return prisma.chunk.findMany({
    where: { documentId },
    orderBy: {
      position: 'asc',
    },
    ...(limit && { take: limit }),
  });
}

// Tailoring Session operations

export async function createTailoringSession(data: {
  userId: string;
  projectId: string;
  taskInput: string;
  assembledContext: string;
  targetPlatform: 'CHATGPT' | 'CLAUDE';
  tokenCount: number;
  qualityScore?: number;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.tailoringSession.create({
    data,
  });
}

export async function getTailoringSessionWithSearchResults(sessionId: string) {
  return prisma.tailoringSession.findUnique({
    where: { id: sessionId },
    include: {
      webSearchResults: {
        orderBy: {
          relevanceScore: 'desc',
        },
      },
      project: true,
    },
  });
}

export async function listUserTailoringSessions(
  userId: string,
  projectId?: string,
  limit: number = 50
) {
  return prisma.tailoringSession.findMany({
    where: {
      userId,
      ...(projectId && { projectId }),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          webSearchResults: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

// Web Search Result operations

export async function createWebSearchResults(
  sessionId: string,
  results: Array<{
    query: string;
    url: string;
    title: string;
    snippet: string;
    relevanceScore: number;
  }>
) {
  return prisma.webSearchResult.createMany({
    data: results.map(result => ({
      sessionId,
      ...result,
    })),
  });
}

// Analytics / Stats operations

export async function getUserStats(userId: string) {
  const [projectCount, documentCount, sessionCount] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.document.count({
      where: {
        project: {
          userId,
        },
      },
    }),
    prisma.tailoringSession.count({ where: { userId } }),
  ]);

  return {
    projectCount,
    documentCount,
    sessionCount,
  };
}

export async function getProjectStats(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      _count: {
        select: {
          documents: true,
          tailoringSessions: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  const totalChunks = await prisma.chunk.count({
    where: {
      document: {
        projectId,
      },
    },
  });

  return {
    documentCount: project._count.documents,
    sessionCount: project._count.tailoringSessions,
    chunkCount: totalChunks,
  };
}
