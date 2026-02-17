import type { Citation } from '@agenttailor/shared';
import type { SynthesizedBlock, ScoredChunk } from '@agenttailor/shared';

/**
 * Collect and deduplicate citations from synthesized blocks and scored chunks.
 *
 * - For each block's sources, a Citation is created based on sourceType.
 * - Duplicates (same sourceId) are deduplicated, keeping the highest relevanceScore.
 * - Citations are assigned sequential string IDs ("1", "2", ...).
 * - chunkIndex is the block's position in the blocks array.
 * - relevanceScore is the block's priority (clamped to [0, 1]).
 */
export function collectCitations(
  synthesizedBlocks: SynthesizedBlock[],
  _scoredChunks: ScoredChunk[],
): Citation[] {
  // Map from sourceId → best-so-far citation (before ID assignment)
  const best = new Map<string, Omit<Citation, 'id'>>();

  for (let blockIndex = 0; blockIndex < synthesizedBlocks.length; blockIndex++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const block = synthesizedBlocks[blockIndex]!;
    const relevanceScore = Math.min(1, Math.max(0, block.priority));

    for (const source of block.sources) {
      const existing = best.get(source.sourceId);

      if (source.sourceType === 'PROJECT_DOC') {
        const candidate: Omit<Citation, 'id'> = {
          type: 'document',
          sourceTitle: source.title,
          documentId: source.sourceId,
          chunkIndex: blockIndex,
          relevanceScore,
        };

        if (!existing || relevanceScore > existing.relevanceScore) {
          best.set(source.sourceId, candidate);
        }
      } else if (source.sourceType === 'WEB_SEARCH') {
        const candidate: Omit<Citation, 'id'> = {
          type: 'web',
          sourceTitle: source.title,
          sourceUrl: source.url,
          chunkIndex: blockIndex,
          relevanceScore,
          fetchedAt: source.timestamp,
        };

        if (!existing || relevanceScore > existing.relevanceScore) {
          best.set(source.sourceId, candidate);
        }
      }
      // API_RESPONSE and USER_INPUT are silently skipped (MVP scope)
    }
  }

  // Assign sequential IDs
  const citations: Citation[] = [];
  let seq = 1;
  for (const [, citationData] of best) {
    citations.push({ id: String(seq++), ...citationData });
  }

  return citations;
}
