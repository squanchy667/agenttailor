export interface VectorItem {
  id: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface VectorStore {
  upsert(collectionName: string, items: VectorItem[]): Promise<void>;
  query(
    collectionName: string,
    embedding: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;
  delete(collectionName: string, ids: string[]): Promise<void>;
  deleteCollection(collectionName: string): Promise<void>;
}
