import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Local Mode', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('createEmbedder factory', () => {
    it('returns LocalEmbedder when EMBEDDING_PROVIDER=local', async () => {
      process.env.EMBEDDING_PROVIDER = 'local';
      const { createEmbedder } = await import('../../services/embedding/embedder.js');
      const embedder = createEmbedder();
      expect(embedder.constructor.name).toBe('LocalEmbedder');
    });

    it('returns LocalEmbedder by default (no EMBEDDING_PROVIDER set)', async () => {
      delete process.env.EMBEDDING_PROVIDER;
      const { createEmbedder } = await import('../../services/embedding/embedder.js');
      const embedder = createEmbedder();
      expect(embedder.constructor.name).toBe('LocalEmbedder');
    });

    it('returns OpenAIEmbedder when EMBEDDING_PROVIDER=openai', async () => {
      process.env.EMBEDDING_PROVIDER = 'openai';
      const { createEmbedder } = await import('../../services/embedding/embedder.js');
      const embedder = createEmbedder();
      expect(embedder.constructor.name).toBe('OpenAIEmbedder');
    });
  });

  describe('createCrossEncoder factory', () => {
    it('returns NoopCrossEncoder when EMBEDDING_PROVIDER=local', async () => {
      process.env.EMBEDDING_PROVIDER = 'local';
      delete process.env.CROSS_ENCODER_PROVIDER;
      const { createCrossEncoder } = await import('../../services/intelligence/crossEncoder.js');
      const encoder = createCrossEncoder();
      expect(encoder.constructor.name).toBe('NoopCrossEncoder');
    });

    it('returns NoopCrossEncoder by default (no env vars set)', async () => {
      delete process.env.EMBEDDING_PROVIDER;
      delete process.env.CROSS_ENCODER_PROVIDER;
      const { createCrossEncoder } = await import('../../services/intelligence/crossEncoder.js');
      const encoder = createCrossEncoder();
      expect(encoder.constructor.name).toBe('NoopCrossEncoder');
    });

    it('NoopCrossEncoder returns 0.5 for all passages', async () => {
      const { NoopCrossEncoder } = await import('../../services/intelligence/crossEncoder.js');
      const encoder = new NoopCrossEncoder();
      const results = await encoder.rerank('test query', ['passage 1', 'passage 2', 'passage 3']);
      expect(results).toEqual([
        { index: 0, score: 0.5 },
        { index: 1, score: 0.5 },
        { index: 2, score: 0.5 },
      ]);
    });
  });
});
