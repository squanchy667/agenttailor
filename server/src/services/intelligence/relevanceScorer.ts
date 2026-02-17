import type { ScoredChunk, ScoringConfig } from '@agenttailor/shared';
import { ScoringConfigSchema } from '@agenttailor/shared';
import { searchDocuments } from '../searchService.js';
import { createCrossEncoder } from './crossEncoder.js';

const MIN_FINAL_SCORE = 0.3;

export async function scoreChunks(
  query: string,
  projectId: string,
  userId: string,
  config?: Partial<ScoringConfig>,
): Promise<ScoredChunk[]> {
  const resolvedConfig = ScoringConfigSchema.parse(config ?? {});
  const { candidateCount, rerankCount, returnCount, biEncoderWeight, crossEncoderWeight } =
    resolvedConfig;

  const { results } = await searchDocuments(userId, {
    query,
    projectId,
    topK: candidateCount,
  });

  if (results.length === 0) {
    return [];
  }

  const candidates = results.slice(0, rerankCount);

  let crossEncoderScores: { index: number; score: number }[];

  try {
    const encoder = createCrossEncoder();
    crossEncoderScores = await encoder.rerank(
      query,
      candidates.map((c) => c.content),
    );
  } catch (err) {
    console.warn('[relevanceScorer] Cross-encoder failed, falling back to bi-encoder scores:', err);
    crossEncoderScores = candidates.map((_, index) => ({ index, score: candidates[index]!.score }));
  }

  const scoreMap = new Map<number, number>();
  for (const { index, score } of crossEncoderScores) {
    scoreMap.set(index, score);
  }

  const scored: ScoredChunk[] = candidates
    .map((result, index) => {
      const biEncoderScore = result.score;
      const crossEncoderScore = scoreMap.get(index) ?? biEncoderScore;
      const finalScore = biEncoderWeight * biEncoderScore + crossEncoderWeight * crossEncoderScore;

      return {
        chunkId: result.chunkId,
        documentId: result.documentId,
        content: result.content,
        biEncoderScore,
        crossEncoderScore,
        finalScore,
        metadata: result.metadata,
        rank: 0,
      };
    })
    .filter((chunk) => chunk.finalScore >= MIN_FINAL_SCORE);

  scored.sort((a, b) => b.finalScore - a.finalScore);

  return scored.slice(0, returnCount).map((chunk, index) => ({
    ...chunk,
    rank: index,
  }));
}
