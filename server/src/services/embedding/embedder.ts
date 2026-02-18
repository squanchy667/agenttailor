import type { EmbeddingConfig } from '@agenttailor/shared';
import { EmbeddingConfigSchema } from '@agenttailor/shared';
import type OpenAI from 'openai';
import { getOpenAIClient } from '../../lib/openai.js';
import { LocalEmbedder } from './localEmbedder.js';

export interface Embedder {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

class OpenAIEmbedder implements Embedder {
  private config: EmbeddingConfig;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = EmbeddingConfigSchema.parse(config ?? {});
  }

  async embedText(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (!first) {
      throw new Error('No embedding returned');
    }
    return first;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const client = getOpenAIClient();
    const batchSize = this.config.batchSize;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.callWithRetry(client, batch);

      for (const item of response.data) {
        allEmbeddings.push(item.embedding);
      }
    }

    return allEmbeddings;
  }

  private async callWithRetry(
    client: OpenAI,
    input: string[],
    maxRetries = 3,
  ): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await client.embeddings.create({
          model: this.config.model,
          input,
        });
      } catch (error: unknown) {
        lastError = error;
        // Check if rate limited (429)
        if (
          error instanceof Error &&
          'status' in error &&
          (error as { status: number }).status === 429
        ) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }
}

export function createEmbedder(config?: Partial<EmbeddingConfig>): Embedder {
  const provider = process.env.EMBEDDING_PROVIDER ?? 'local';

  if (provider === 'local') {
    return new LocalEmbedder();
  }

  return new OpenAIEmbedder(config);
}
