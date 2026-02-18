import { describe, it, expect } from 'vitest';
import { TailorRequestSchema } from '../tailor.js';
import { QualityScoreSchema, QualitySubScoresSchema } from '../qualityScore.js';

describe('TailorRequestSchema', () => {
  const validRequest = {
    taskInput: 'Implement user authentication',
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    targetPlatform: 'chatgpt' as const,
  };

  it('accepts valid request', () => {
    const result = TailorRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('accepts request with options', () => {
    const result = TailorRequestSchema.safeParse({
      ...validRequest,
      options: { maxTokens: 4000, includeWebSearch: false, includeScore: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty taskInput', () => {
    const result = TailorRequestSchema.safeParse({ ...validRequest, taskInput: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing taskInput', () => {
    const { taskInput: _, ...rest } = validRequest;
    const result = TailorRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid projectId', () => {
    const result = TailorRequestSchema.safeParse({ ...validRequest, projectId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid targetPlatform', () => {
    const result = TailorRequestSchema.safeParse({ ...validRequest, targetPlatform: 'gemini' });
    expect(result.success).toBe(false);
  });

  it('accepts claude as targetPlatform', () => {
    const result = TailorRequestSchema.safeParse({ ...validRequest, targetPlatform: 'claude' });
    expect(result.success).toBe(true);
  });
});

describe('QualityScoreSchema', () => {
  it('accepts valid quality score', () => {
    const result = QualityScoreSchema.safeParse({
      overall: 85,
      subScores: { coverage: 0.9, diversity: 0.7, relevance: 0.85, compression: 0.8 },
      suggestions: [],
      scoredAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects overall score above 100', () => {
    const result = QualityScoreSchema.safeParse({
      overall: 101,
      subScores: { coverage: 0.9, diversity: 0.7, relevance: 0.85, compression: 0.8 },
      suggestions: [],
      scoredAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects sub-score above 1', () => {
    const result = QualitySubScoresSchema.safeParse({
      coverage: 1.5,
      diversity: 0.7,
      relevance: 0.85,
      compression: 0.8,
    });
    expect(result.success).toBe(false);
  });
});
