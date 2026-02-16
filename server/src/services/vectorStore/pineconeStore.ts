import { Pinecone } from '@pinecone-database/pinecone';
import type { VectorStore, VectorItem, VectorSearchResult } from './types.js';

export class PineconeStore implements VectorStore {
  private client: Pinecone;
  private indexName: string;

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    this.client = new Pinecone({ apiKey });
    this.indexName = process.env.PINECONE_INDEX || 'agenttailor';
  }

  private getIndex() {
    return this.client.index(this.indexName);
  }

  async upsert(collectionName: string, items: VectorItem[]): Promise<void> {
    const index = this.getIndex().namespace(collectionName);
    const vectors = items.map((item) => ({
      id: item.id,
      values: item.embedding,
      metadata: item.metadata as
        | Record<string, string | number | boolean | string[]>
        | undefined,
    }));

    // Pinecone recommends batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
  }

  async query(
    collectionName: string,
    embedding: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    const index = this.getIndex().namespace(collectionName);
    const results = await index.query({
      vector: embedding,
      topK,
      filter: filter as
        | Record<string, string | number | boolean | string[]>
        | undefined,
      includeMetadata: true,
    });

    return (results.matches ?? []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata as Record<string, unknown> | undefined,
    }));
  }

  async delete(collectionName: string, ids: string[]): Promise<void> {
    const index = this.getIndex().namespace(collectionName);
    await index.deleteMany(ids);
  }

  async deleteCollection(collectionName: string): Promise<void> {
    const index = this.getIndex().namespace(collectionName);
    await index.deleteAll();
  }
}
