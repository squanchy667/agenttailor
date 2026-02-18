import type { Embedder } from './embedder.js';

/**
 * Local embedder using @xenova/transformers (all-MiniLM-L6-v2).
 * 384-dimensional embeddings, ~90MB model auto-downloaded on first use.
 * No API keys required.
 */

// Lazy-loaded pipeline — import only when first embedding is requested
let pipelineInstance: ((text: string | string[]) => Promise<{ tolist: () => number[][] }>) | null = null;

async function getPipeline() {
  if (!pipelineInstance) {
    // Dynamic import to avoid loading transformers unless needed
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    pipelineInstance = async (texts: string | string[]) => {
      const output = await extractor(texts, { pooling: 'mean', normalize: true });
      return output;
    };
    console.log('Local embedding model loaded: Xenova/all-MiniLM-L6-v2 (384 dims)');
  }
  return pipelineInstance;
}

export class LocalEmbedder implements Embedder {
  async embedText(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (!first) {
      throw new Error('No embedding returned');
    }
    return first;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const pipe = await getPipeline();
    const allEmbeddings: number[][] = [];

    // Process in batches to avoid memory issues
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const output = await pipe(batch);
      const vectors = output.tolist();
      allEmbeddings.push(...vectors);
    }

    return allEmbeddings;
  }
}
