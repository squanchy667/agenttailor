import { describe, it, expect } from 'vitest';
import {
  scoreCoverage,
  scoreDiversity,
  scoreRelevance,
  scoreCompression,
  generateSuggestions,
  scoreContext,
} from '../qualityScorer.js';

describe('scoreCoverage', () => {
  it('returns 1 when all keywords are covered', () => {
    const score = scoreCoverage('implement authentication system', [
      'implement the authentication system for the app',
    ]);
    expect(score).toBe(1);
  });

  it('returns partial score when some keywords are missing', () => {
    const score = scoreCoverage('implement authentication system database', [
      'implement the authentication system',
    ]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns 1 for tasks with no significant keywords', () => {
    const score = scoreCoverage('do it', []);
    expect(score).toBe(1);
  });
});

describe('scoreDiversity', () => {
  it('returns 0 for empty sources', () => {
    expect(scoreDiversity([])).toBe(0);
  });

  it('returns 0.2 for single source', () => {
    expect(scoreDiversity([{ documentId: 'a', finalScore: 0.8 }])).toBe(0.2);
  });

  it('returns 0.5 for two different sources', () => {
    expect(
      scoreDiversity([
        { documentId: 'a', finalScore: 0.8 },
        { documentId: 'b', finalScore: 0.7 },
      ]),
    ).toBe(0.5);
  });

  it('returns 0.8 for three or more different sources', () => {
    expect(
      scoreDiversity([
        { documentId: 'a', finalScore: 0.8 },
        { documentId: 'b', finalScore: 0.7 },
        { documentId: 'c', finalScore: 0.6 },
      ]),
    ).toBe(0.8);
  });

  it('adds mixed types bonus', () => {
    expect(
      scoreDiversity([
        { documentId: 'a', finalScore: 0.8, sourceType: 'document' },
        { documentId: 'a', finalScore: 0.7, sourceType: 'web' },
      ]),
    ).toBe(0.4); // 0.2 base (1 unique doc) + 0.2 mixed types
  });
});

describe('scoreRelevance', () => {
  it('returns 0 for empty chunks', () => {
    expect(scoreRelevance([])).toBe(0);
  });

  it('returns high score for high-relevance chunks', () => {
    const score = scoreRelevance([
      { documentId: 'a', finalScore: 0.9 },
      { documentId: 'b', finalScore: 0.85 },
    ]);
    expect(score).toBeGreaterThan(0.8);
  });

  it('penalizes low-relevance chunks', () => {
    const highScore = scoreRelevance([
      { documentId: 'a', finalScore: 0.9 },
      { documentId: 'b', finalScore: 0.8 },
    ]);
    const lowScore = scoreRelevance([
      { documentId: 'a', finalScore: 0.9 },
      { documentId: 'b', finalScore: 0.1 },
    ]);
    expect(lowScore).toBeLessThan(highScore);
  });
});

describe('scoreCompression', () => {
  it('returns 0.5 for zero raw tokens', () => {
    expect(scoreCompression(0, 0)).toBe(0.5);
  });

  it('returns 1 for sweet-spot ratio (0.2-0.5)', () => {
    expect(scoreCompression(1000, 300)).toBe(1);
    expect(scoreCompression(1000, 500)).toBe(1);
  });

  it('scores lower for no compression (ratio near 1)', () => {
    const score = scoreCompression(1000, 900);
    expect(score).toBeLessThan(1);
    expect(score).toBeGreaterThan(0);
  });

  it('scores lower for too much compression', () => {
    const score = scoreCompression(1000, 50);
    expect(score).toBeLessThan(1);
    expect(score).toBeGreaterThan(0);
  });
});

describe('generateSuggestions', () => {
  it('returns no suggestions for high scores', () => {
    const suggestions = generateSuggestions({
      coverage: 0.9,
      diversity: 0.8,
      relevance: 0.85,
      compression: 0.7,
    });
    expect(suggestions).toHaveLength(0);
  });

  it('suggests coverage improvement for low coverage', () => {
    const suggestions = generateSuggestions({
      coverage: 0.3,
      diversity: 0.8,
      relevance: 0.85,
      compression: 0.7,
    });
    expect(suggestions.some((s) => s.includes('documentation'))).toBe(true);
  });

  it('suggests diversity improvement for low diversity', () => {
    const suggestions = generateSuggestions({
      coverage: 0.9,
      diversity: 0.3,
      relevance: 0.85,
      compression: 0.7,
    });
    expect(suggestions.some((s) => s.includes('single source'))).toBe(true);
  });
});

describe('scoreContext', () => {
  it('returns a complete quality score', () => {
    const result = scoreContext(
      'build authentication',
      ['authentication module with JWT tokens'],
      [{ documentId: 'doc1', finalScore: 0.8 }],
      1000,
      400,
    );

    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.subScores.coverage).toBeGreaterThanOrEqual(0);
    expect(result.subScores.coverage).toBeLessThanOrEqual(1);
    expect(result.scoredAt).toBeTruthy();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});
