import { describe, it, expect, vi } from 'vitest';
import { handleUploadDocument, UPLOAD_DOCUMENT_TOOL } from '../uploadDocument.js';
import { ApiClientError } from '../../lib/apiClient.js';
import type { ApiClient } from '../../lib/apiClient.js';

function mockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    tailorContext: vi.fn(),
    searchDocs: vi.fn(),
    uploadDocument: vi.fn(),
    listProjects: vi.fn(),
    listDocuments: vi.fn(),
    getDocumentContent: vi.fn(),
    listSessions: vi.fn(),
    getSessionDetail: vi.fn(),
    ...overrides,
  } as unknown as ApiClient;
}

const VALID_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('UPLOAD_DOCUMENT_TOOL', () => {
  it('has correct tool name', () => {
    expect(UPLOAD_DOCUMENT_TOOL.name).toBe('upload_document');
  });

  it('has inputSchema with required fields', () => {
    expect(UPLOAD_DOCUMENT_TOOL.inputSchema.required).toContain('projectId');
    expect(UPLOAD_DOCUMENT_TOOL.inputSchema.required).toContain('fileName');
    expect(UPLOAD_DOCUMENT_TOOL.inputSchema.required).toContain('content');
  });
});

describe('handleUploadDocument', () => {
  describe('input validation', () => {
    it('rejects empty args', async () => {
      const client = mockApiClient();
      const result = await handleUploadDocument(client, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Invalid input');
    });

    it('rejects missing fileName', async () => {
      const client = mockApiClient();
      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        content: 'hello',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('fileName');
    });

    it('rejects empty content', async () => {
      const client = mockApiClient();
      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'test.md',
        content: '',
      });
      expect(result.isError).toBe(true);
    });

    it('rejects invalid projectId', async () => {
      const client = mockApiClient();
      const result = await handleUploadDocument(client, {
        projectId: 'not-a-uuid',
        fileName: 'test.md',
        content: 'hello',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('content size limit', () => {
    it('rejects content over 10MB', async () => {
      const client = mockApiClient();
      const largeContent = 'x'.repeat(10 * 1024 * 1024 + 1);

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'huge.txt',
        content: largeContent,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('File too large');
      expect(result.content[0]!.text).toContain('10MB');
    });

    it('accepts content exactly at 10MB', async () => {
      const uploadFn = vi.fn().mockResolvedValue({
        documentId: 'doc-1',
        fileName: 'big.txt',
        status: 'processing',
      });
      const client = mockApiClient({ uploadDocument: uploadFn });
      const content = 'x'.repeat(10 * 1024 * 1024);

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'big.txt',
        content,
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('successful responses', () => {
    it('formats processing status response', async () => {
      const client = mockApiClient({
        uploadDocument: vi.fn().mockResolvedValue({
          documentId: 'doc-123',
          fileName: 'guide.md',
          status: 'processing',
        }),
      });

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'guide.md',
        content: '# Guide\nSome content.',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0]!.text).toContain('Document uploaded successfully');
      expect(result.content[0]!.text).toContain('guide.md');
      expect(result.content[0]!.text).toContain('doc-123');
      expect(result.content[0]!.text).toContain('being processed');
    });

    it('formats complete status with chunk count', async () => {
      const client = mockApiClient({
        uploadDocument: vi.fn().mockResolvedValue({
          documentId: 'doc-456',
          fileName: 'readme.md',
          status: 'complete',
          chunkCount: 12,
        }),
      });

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'readme.md',
        content: '# README',
      });

      expect(result.content[0]!.text).toContain('Processing complete');
      expect(result.content[0]!.text).toContain('12 chunk(s)');
    });

    it('handles complete status with zero chunks', async () => {
      const client = mockApiClient({
        uploadDocument: vi.fn().mockResolvedValue({
          documentId: 'doc-789',
          fileName: 'empty.txt',
          status: 'complete',
          chunkCount: 0,
        }),
      });

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'empty.txt',
        content: ' ',
      });

      expect(result.content[0]!.text).toContain('0 chunk(s)');
    });

    it('applies default mimeType', async () => {
      const uploadFn = vi.fn().mockResolvedValue({
        documentId: 'doc-1',
        fileName: 'test.md',
        status: 'processing',
      });
      const client = mockApiClient({ uploadDocument: uploadFn });

      await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'test.md',
        content: '# Test',
      });

      expect(uploadFn).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: 'text/plain' }),
      );
    });
  });

  describe('error handling', () => {
    it('returns formatted error for ApiClientError', async () => {
      const client = mockApiClient({
        uploadDocument: vi.fn().mockRejectedValue(
          new ApiClientError('Quota exceeded', 403, 'QUOTA_EXCEEDED'),
        ),
      });

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'test.md',
        content: 'hello',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('API error');
      expect(result.content[0]!.text).toContain('QUOTA_EXCEEDED');
    });

    it('returns formatted error for unexpected errors', async () => {
      const client = mockApiClient({
        uploadDocument: vi.fn().mockRejectedValue(new Error('Connection reset')),
      });

      const result = await handleUploadDocument(client, {
        projectId: VALID_PROJECT_ID,
        fileName: 'test.md',
        content: 'hello',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Connection reset');
    });
  });
});
