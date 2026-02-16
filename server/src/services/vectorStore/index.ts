import type { VectorStore } from './types.js';
import { ChromaStore } from './chromaStore.js';
import { PineconeStore } from './pineconeStore.js';

export type { VectorStore, VectorItem, VectorSearchResult } from './types.js';

export type VectorStoreProvider = 'chroma' | 'pinecone';

export function createVectorStore(provider?: VectorStoreProvider): VectorStore {
  const resolvedProvider =
    provider ??
    (process.env.VECTOR_STORE_PROVIDER as VectorStoreProvider) ??
    'chroma';

  switch (resolvedProvider) {
    case 'pinecone':
      return new PineconeStore();
    case 'chroma':
    default:
      return new ChromaStore();
  }
}
