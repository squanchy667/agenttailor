import { ChromaClient } from 'chromadb';
import type { VectorStore, VectorItem, VectorSearchResult } from './types.js';

export class ChromaStore implements VectorStore {
  private client: ChromaClient;

  constructor(url?: string) {
    this.client = new ChromaClient({
      path: url || process.env.CHROMA_URL || 'http://localhost:8000',
    });
  }

  async upsert(collectionName: string, items: VectorItem[]): Promise<void> {
    const collection = await this.client.getOrCreateCollection({
      name: collectionName,
    });
    await collection.upsert({
      ids: items.map((item) => item.id),
      embeddings: items.map((item) => item.embedding),
      metadatas: items.map(
        (item) =>
          (item.metadata as Record<string, string | number | boolean>) ?? {},
      ),
    });
  }

  async query(
    collectionName: string,
    embedding: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    const collection = await this.client.getOrCreateCollection({
      name: collectionName,
    });
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
      where:
        (filter as Record<string, string | number | boolean> | undefined) ??
        undefined,
    });

    const ids = results.ids[0];
    const distances = results.distances?.[0];
    const metadatas = results.metadatas?.[0];

    if (!ids) return [];

    return ids.map((id, index) => ({
      id,
      score: distances ? 1 - (distances[index] ?? 0) : 0,
      metadata: metadatas?.[index] as Record<string, unknown> | undefined,
    }));
  }

  async delete(collectionName: string, ids: string[]): Promise<void> {
    const collection = await this.client.getOrCreateCollection({
      name: collectionName,
    });
    await collection.delete({ ids });
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name: collectionName });
    } catch {
      // Collection may not exist, ignore
    }
  }
}
