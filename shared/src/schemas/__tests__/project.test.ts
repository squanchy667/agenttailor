import { describe, it, expect } from 'vitest';
import { CreateProjectInput, ProjectResponse } from '../project.js';

describe('CreateProjectInput', () => {
  it('accepts valid input', () => {
    const result = CreateProjectInput.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with description', () => {
    const result = CreateProjectInput.safeParse({
      name: 'My Project',
      description: 'A test project',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateProjectInput.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = CreateProjectInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = CreateProjectInput.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('allows description to be omitted', () => {
    const result = CreateProjectInput.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });
});

describe('ProjectResponse', () => {
  it('parses a valid response', () => {
    const result = ProjectResponse.safeParse({
      id: 'clxyz123',
      name: 'Test Project',
      description: null,
      documentCount: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('parses with Date objects', () => {
    const result = ProjectResponse.safeParse({
      id: 'clxyz123',
      name: 'Test',
      description: 'Desc',
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = ProjectResponse.safeParse({ id: 'test' });
    expect(result.success).toBe(false);
  });
});
