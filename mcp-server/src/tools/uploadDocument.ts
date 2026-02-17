/**
 * upload_document MCP tool
 * Upload a document to a project for indexing through the ingestion pipeline.
 */

import type { ApiClient } from '../lib/apiClient.js';
import { UploadDocumentInputSchema } from '@agenttailor/shared';
import { zodToJsonSchema } from '../lib/zodToJsonSchema.js';
import { ApiClientError } from '../lib/apiClient.js';

const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB

export const UPLOAD_DOCUMENT_TOOL = {
  name: 'upload_document',
  description:
    'Upload a document to a project for indexing. Supports text, markdown, and base64-encoded files. ' +
    'The document will be chunked and embedded for semantic search. Maximum file size: 10MB.',
  inputSchema: zodToJsonSchema(UploadDocumentInputSchema),
} as const;

export async function handleUploadDocument(
  apiClient: ApiClient,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const parsed = UploadDocumentInputSchema.safeParse(args);

  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  // Check content size before sending to API
  if (parsed.data.content.length > MAX_CONTENT_SIZE) {
    return {
      content: [
        {
          type: 'text',
          text: `File too large: content is ${Math.round(parsed.data.content.length / 1024 / 1024)}MB, maximum is 10MB.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await apiClient.uploadDocument(parsed.data);

    const statusText = result.status === 'complete'
      ? `Processing complete — ${result.chunkCount ?? 0} chunk(s) created.`
      : 'Document is being processed. Chunks will be available shortly.';

    return {
      content: [
        {
          type: 'text',
          text: `Document uploaded successfully.\n\n` +
            `- **File**: ${result.fileName}\n` +
            `- **ID**: ${result.documentId}\n` +
            `- **Status**: ${statusText}`,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? `API error (${error.code}): ${error.message}`
        : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;

    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
