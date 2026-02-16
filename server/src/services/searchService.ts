/**
 * Semantic search service
 * Embeds a query, searches the vector store, and hydrates results with Prisma data.
 */
import type { SearchRequest, SearchResult } from '@agenttailor/shared';
import { createEmbedder } from './embedding/embedder.js';
import { createVectorStore } from './vectorStore/index.js';
import { prisma } from '../lib/prisma.js';

/**
 * Generate a truncated highlight from chunk content
 */
function generateHighlight(content: string, maxLength = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trimEnd() + '...';
}

/**
 * Rough token estimate (~1.3 tokens per whitespace-separated word)
 */
function estimateTokens(text: string): number {
  return Math.ceil(
    text
      .split(/\s+/)
      .filter(Boolean).length * 1.3,
  );
}

/**
 * Full semantic search: embed query -> vector search -> hydrate chunks + documents
 */
export async function searchDocuments(
  userId: string,
  request: SearchRequest,
): Promise<{
  results: SearchResult[];
  totalFound: number;
  queryTokenCount: number;
  searchTimeMs: number;
}> {
  const startTime = Date.now();

  // Verify project belongs to user
  const project = await prisma.project.findFirst({
    where: { id: request.projectId, userId },
  });
  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  // Embed the query
  const embedder = createEmbedder();
  const queryEmbedding = await embedder.embedText(request.query);
  const queryTokenCount = estimateTokens(request.query);

  // Build vector store filter
  const filter: Record<string, unknown> = {
    projectId: request.projectId,
  };
  if (request.filters?.documentIds && request.filters.documentIds.length > 0) {
    filter['documentId'] = { $in: request.filters.documentIds };
  }

  // Query vector store
  const vectorStore = createVectorStore();
  const collectionName = `project_${request.projectId}`;
  const vectorResults = await vectorStore.query(
    collectionName,
    queryEmbedding,
    request.topK,
    Object.keys(filter).length > 1 ? filter : undefined,
  );

  if (vectorResults.length === 0) {
    return {
      results: [],
      totalFound: 0,
      queryTokenCount,
      searchTimeMs: Date.now() - startTime,
    };
  }

  // Hydrate with chunk and document data
  const chunkIds = vectorResults.map((r) => r.id);
  const chunks = await prisma.chunk.findMany({
    where: { id: { in: chunkIds } },
    include: {
      document: {
        select: { id: true, filename: true, type: true },
      },
    },
  });

  const chunkMap = new Map(chunks.map((c) => [c.id, c]));

  // Build results with scores, applying post-filters
  const results: SearchResult[] = [];
  for (const vr of vectorResults) {
    const chunk = chunkMap.get(vr.id);
    if (!chunk) continue;

    const score = vr.score;

    // Apply minScore filter
    if (request.filters?.minScore !== undefined && score < request.filters.minScore) {
      continue;
    }

    // Apply documentType filter
    if (
      request.filters?.documentTypes &&
      request.filters.documentTypes.length > 0 &&
      !request.filters.documentTypes.includes(chunk.document.type)
    ) {
      continue;
    }

    results.push({
      chunkId: chunk.id,
      documentId: chunk.document.id,
      documentFilename: chunk.document.filename,
      content: chunk.content,
      score,
      metadata: (chunk.metadata as Record<string, unknown> | undefined) ?? undefined,
      highlight: generateHighlight(chunk.content),
    });
  }

  return {
    results,
    totalFound: results.length,
    queryTokenCount,
    searchTimeMs: Date.now() - startTime,
  };
}

/**
 * Search across multiple projects and merge results by score
 */
export async function searchMultiProject(
  userId: string,
  query: string,
  projectIds: string[],
  topK = 10,
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];

  for (const projectId of projectIds) {
    try {
      const { results } = await searchDocuments(userId, { query, projectId, topK });
      allResults.push(...results);
    } catch {
      // Skip projects that fail (e.g., not found or not owned)
    }
  }

  // Sort by score descending, take topK
  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, topK);
}
