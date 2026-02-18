import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodToJsonSchema } from '../zodToJsonSchema.js';
import {
  TailorContextInputSchema,
  SearchDocsInputSchema,
  UploadDocumentInputSchema,
} from '@agenttailor/shared';

describe('zodToJsonSchema', () => {
  describe('primitive types', () => {
    it('converts ZodString to { type: "string" }', () => {
      const schema = z.object({ name: z.string() });
      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      });
    });

    it('converts ZodNumber to { type: "number" }', () => {
      const schema = z.object({ count: z.number() });
      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: { count: { type: 'number' } },
        required: ['count'],
      });
    });

    it('converts ZodBoolean to { type: "boolean" }', () => {
      const schema = z.object({ active: z.boolean() });
      const result = zodToJsonSchema(schema);
      expect(result).toEqual({
        type: 'object',
        properties: { active: { type: 'boolean' } },
        required: ['active'],
      });
    });
  });

  describe('enum type', () => {
    it('converts ZodEnum to { type: "string", enum: [...] }', () => {
      const schema = z.object({ role: z.enum(['admin', 'user', 'viewer']) });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['role']).toEqual({
        type: 'string',
        enum: ['admin', 'user', 'viewer'],
      });
    });

    it('handles single-value enum', () => {
      const schema = z.object({ type: z.enum(['fixed']) });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['type']).toEqual({
        type: 'string',
        enum: ['fixed'],
      });
    });
  });

  describe('array type', () => {
    it('converts ZodArray to { type: "array", items: ... }', () => {
      const schema = z.object({ tags: z.array(z.string()) });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['tags']).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('handles array of numbers', () => {
      const schema = z.object({ scores: z.array(z.number()) });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['scores']).toEqual({
        type: 'array',
        items: { type: 'number' },
      });
    });
  });

  describe('optional fields', () => {
    it('excludes ZodOptional fields from required', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });
      const result = zodToJsonSchema(schema);
      expect(result.required).toEqual(['name']);
      expect(result.properties!['nickname']).toEqual({ type: 'string' });
    });

    it('omits required array when all fields are optional', () => {
      const schema = z.object({
        a: z.string().optional(),
        b: z.number().optional(),
      });
      const result = zodToJsonSchema(schema);
      expect(result.required).toBeUndefined();
    });
  });

  describe('default values', () => {
    it('adds default value and excludes from required', () => {
      const schema = z.object({
        limit: z.number().default(10),
        name: z.string(),
      });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['limit']).toEqual({ type: 'number', default: 10 });
      expect(result.required).toEqual(['name']);
    });

    it('handles boolean default', () => {
      const schema = z.object({
        enabled: z.boolean().default(true),
      });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['enabled']).toEqual({ type: 'boolean', default: true });
      expect(result.required).toBeUndefined();
    });

    it('handles string default', () => {
      const schema = z.object({
        format: z.string().default('json'),
      });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['format']).toEqual({ type: 'string', default: 'json' });
    });
  });

  describe('descriptions', () => {
    it('preserves field descriptions', () => {
      const schema = z.object({
        query: z.string().describe('The search query'),
      });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['query']).toEqual({
        type: 'string',
        description: 'The search query',
      });
    });

    it('preserves description on optional fields', () => {
      const schema = z.object({
        limit: z.number().optional().describe('Max results'),
      });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['limit']).toEqual({
        type: 'number',
        description: 'Max results',
      });
    });

    it('preserves description on default fields', () => {
      const schema = z.object({
        topK: z.number().default(5).describe('Number of results'),
      });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['topK']).toEqual({
        type: 'number',
        default: 5,
        description: 'Number of results',
      });
    });
  });

  describe('real MCP schemas', () => {
    it('converts TailorContextInputSchema correctly', () => {
      const result = zodToJsonSchema(TailorContextInputSchema);
      expect(result.type).toBe('object');
      expect(result.required).toEqual(['task', 'projectId']);
      expect(result.properties!['task']).toMatchObject({ type: 'string' });
      expect(result.properties!['projectId']).toMatchObject({ type: 'string' });
      expect(result.properties!['maxTokens']).toMatchObject({ type: 'number', default: 4000 });
      expect(result.properties!['includeWebSearch']).toMatchObject({ type: 'boolean', default: true });
    });

    it('converts SearchDocsInputSchema correctly', () => {
      const result = zodToJsonSchema(SearchDocsInputSchema);
      expect(result.type).toBe('object');
      expect(result.required).toEqual(['query', 'projectId']);
      expect(result.properties!['topK']).toMatchObject({ type: 'number', default: 5 });
      expect(result.properties!['minScore']).toMatchObject({ type: 'number', default: 0.5 });
    });

    it('converts UploadDocumentInputSchema correctly', () => {
      const result = zodToJsonSchema(UploadDocumentInputSchema);
      expect(result.type).toBe('object');
      expect(result.required).toEqual(['projectId', 'fileName', 'content']);
      expect(result.properties!['mimeType']).toMatchObject({ type: 'string', default: 'text/plain' });
    });
  });

  describe('fallback behavior', () => {
    it('falls back to { type: "string" } for unknown Zod types', () => {
      // z.date() is not handled by the converter
      const schema = z.object({ created: z.date() });
      const result = zodToJsonSchema(schema);
      expect(result.properties!['created']).toEqual({ type: 'string' });
    });
  });
});
