/**
 * Config Library
 *
 * Curated index of proven agent configs.
 * CRUD operations, search by stack/domain/role, ratings, usage tracking.
 */
import type { ConfigTemplateResponse } from '@agenttailor/shared';
import { prisma } from '../lib/prisma.js';
import type { AgentFormat } from '@prisma/client';

// ── Search & Query ──────────────────────────────────────────────────────────

export interface ConfigLibrarySearchParams {
  stack?: string[];
  domain?: string;
  category?: string;
  format?: AgentFormat;
  isBuiltIn?: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}

export async function searchConfigLibrary(
  params: ConfigLibrarySearchParams,
): Promise<{ templates: ConfigTemplateResponse[]; total: number }> {
  const {
    stack,
    domain,
    category,
    format,
    isBuiltIn,
    query,
    limit = 20,
    offset = 0,
  } = params;

  const where: Record<string, unknown> = {};

  if (stack && stack.length > 0) {
    where['stack'] = { hasSome: stack };
  }
  if (domain) where['domain'] = domain;
  if (category) where['category'] = category;
  if (format) where['format'] = format;
  if (isBuiltIn !== undefined) where['isBuiltIn'] = isBuiltIn;

  if (query) {
    where['OR'] = [
      { name: { contains: query, mode: 'insensitive' } },
      { category: { contains: query, mode: 'insensitive' } },
      { domain: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [templates, total] = await Promise.all([
    prisma.configTemplate.findMany({
      where,
      orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.configTemplate.count({ where }),
  ]);

  return {
    templates: templates.map(toResponse),
    total,
  };
}

export async function getConfigTemplate(id: string): Promise<ConfigTemplateResponse | null> {
  const template = await prisma.configTemplate.findUnique({ where: { id } });
  return template ? toResponse(template) : null;
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export interface CreateConfigTemplateInput {
  name: string;
  category: string;
  stack: string[];
  domain: string;
  format: AgentFormat;
  content: string;
  source?: string;
  isBuiltIn?: boolean;
}

export async function createConfigTemplate(
  input: CreateConfigTemplateInput,
): Promise<ConfigTemplateResponse> {
  const template = await prisma.configTemplate.create({
    data: {
      name: input.name,
      category: input.category,
      stack: input.stack,
      domain: input.domain,
      format: input.format,
      content: input.content,
      source: input.source ?? null,
      isBuiltIn: input.isBuiltIn ?? false,
    },
  });
  return toResponse(template);
}

export async function deleteConfigTemplate(id: string): Promise<void> {
  await prisma.configTemplate.delete({ where: { id } });
}

// ── Usage tracking ──────────────────────────────────────────────────────────

export async function incrementUsageCount(id: string): Promise<void> {
  await prisma.configTemplate.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}

export async function updateRating(id: string, rating: number): Promise<void> {
  await prisma.configTemplate.update({
    where: { id },
    data: { rating: Math.min(5, Math.max(0, rating)) },
  });
}

// ── Search by requirement ───────────────────────────────────────────────────

export async function findMatchingTemplates(
  stack: string[],
  domain: string,
  limit = 5,
): Promise<ConfigTemplateResponse[]> {
  // Find templates that overlap with any of the requested stack items
  const templates = await prisma.configTemplate.findMany({
    where: {
      OR: [
        { stack: { hasSome: stack } },
        { domain },
      ],
    },
    orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }],
    take: limit,
  });

  return templates.map(toResponse);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface PrismaConfigTemplate {
  id: string;
  name: string;
  category: string;
  stack: string[];
  domain: string;
  format: AgentFormat;
  content: string;
  source: string | null;
  rating: number;
  usageCount: number;
  isBuiltIn: boolean;
  createdAt: Date;
}

function toResponse(template: PrismaConfigTemplate): ConfigTemplateResponse {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    stack: template.stack,
    domain: template.domain,
    format: template.format as ConfigTemplateResponse['format'],
    content: template.content,
    source: template.source,
    rating: template.rating,
    usageCount: template.usageCount,
    isBuiltIn: template.isBuiltIn,
    createdAt: template.createdAt.toISOString(),
  };
}
