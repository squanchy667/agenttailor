import { prisma } from '../lib/prisma.js';
import { getExtractor } from './textExtractor/index.js';
import { chunkDocument } from './chunking/index.js';
import { createEmbedder } from './embedding/embedder.js';
import { createVectorStore } from './vectorStore/index.js';
import type { Prisma } from '@prisma/client';
import fs from 'fs/promises';

/**
 * Process a document through the full pipeline:
 * 1. Read file from disk
 * 2. Extract text based on file type
 * 3. Chunk the text into semantic segments
 * 4. Save chunks to PostgreSQL
 * 5. Generate embeddings
 * 6. Store embeddings in vector DB
 * 7. Update document status
 */
export async function processDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  try {
    // 1. Read file
    const buffer = await fs.readFile(document.filePath);

    // 2. Extract text
    const extractor = getExtractor(document.filename);
    if (!extractor) {
      throw new Error(`No extractor for file: ${document.filename}`);
    }
    const extracted = await extractor.extract(buffer, document.filename);

    if (!extracted.content.trim()) {
      throw new Error('Extracted text is empty');
    }

    // 3. Chunk the text
    const strategy = extracted.metadata?.hasHeadings
      ? 'heading'
      : extracted.metadata?.codeLanguage
        ? 'code'
        : undefined;
    const chunks = chunkDocument(extracted.content, { strategy });

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }

    // 4. Save chunks to PostgreSQL
    await prisma.chunk.createMany({
      data: chunks.map((chunk) => ({
        documentId,
        content: chunk.content,
        position: chunk.position,
        tokenCount: chunk.tokenCount,
        metadata: chunk.metadata as Prisma.InputJsonValue,
      })),
    });

    // 5. Generate embeddings
    const embedder = createEmbedder();
    const texts = chunks.map((c) => c.content);
    const embeddings = await embedder.embedBatch(texts);

    // 6. Store in vector DB
    const vectorStore = createVectorStore();
    const chunkRecords = await prisma.chunk.findMany({
      where: { documentId },
      orderBy: { position: 'asc' },
    });

    const vectorItems = chunkRecords.map((record, index) => ({
      id: record.id,
      embedding: embeddings[index] ?? [],
      metadata: {
        documentId,
        projectId: document.projectId,
        position: record.position,
      },
    }));

    await vectorStore.upsert(`project_${document.projectId}`, vectorItems);

    // 7. Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'READY',
        chunkCount: chunks.length,
        metadata: (extracted.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Update status to ERROR
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ERROR',
        metadata: { error: errorMessage } as Prisma.InputJsonValue,
      },
    });
    throw error;
  }
}
