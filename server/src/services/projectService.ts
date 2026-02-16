import type { CreateProjectInput, UpdateProjectInput } from '@agenttailor/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Service layer for Project CRUD operations.
 * All methods are auth-scoped — userId is required to ensure data isolation.
 */

export async function createProject(userId: string, data: CreateProjectInput) {
  return prisma.project.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
    },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });
}

export async function getProject(userId: string, projectId: string) {
  return prisma.project.findFirst({
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
}

export async function listProjects(
  userId: string,
  query: { page: number; limit: number; search?: string },
) {
  const { page, limit, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {
    userId,
    ...(search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { data, total };
}

export async function updateProject(
  userId: string,
  projectId: string,
  data: UpdateProjectInput,
) {
  // Verify ownership first
  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.project.update({
    where: { id: projectId },
    data,
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const result = await prisma.project.deleteMany({
    where: { id: projectId, userId },
  });

  return result.count > 0;
}
