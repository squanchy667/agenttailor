import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticatedUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { documentProcessingQueue } from '../lib/queue.js';
import { createVectorStore } from '../services/vectorStore/index.js';

/**
 * Document upload and management routes
 * Nested under /projects/:projectId/documents
 */

// --- Multer configuration ---

const uploadsDir = path.resolve('server/uploads');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    // Unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

const allowedExtensions = new Set([
  '.pdf', '.docx', '.md', '.markdown', '.txt',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt', '.cs',
  '.sh', '.bash', '.yaml', '.yml', '.json', '.xml', '.html',
  '.css', '.scss', '.sql',
]);

const upload = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// --- Helpers ---

type DocumentType = 'PDF' | 'DOCX' | 'MARKDOWN' | 'TXT' | 'CODE';

const codeExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt', '.cs',
  '.sh', '.bash', '.yaml', '.yml', '.json', '.xml', '.html',
  '.css', '.scss', '.sql',
]);

function getDocumentType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();

  switch (ext) {
    case '.pdf':
      return 'PDF';
    case '.docx':
      return 'DOCX';
    case '.md':
    case '.markdown':
      return 'MARKDOWN';
    case '.txt':
      return 'TXT';
    default:
      if (codeExtensions.has(ext)) return 'CODE';
      return 'TXT';
  }
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.md':
    case '.markdown':
      return 'text/markdown';
    default:
      return 'text/plain';
  }
}

// --- Router ---

const router = Router();

/**
 * POST /api/projects/:projectId/documents
 * Upload a file, create a Document record, enqueue processing job
 * Returns 202 Accepted since processing is async
 */
router.post(
  '/:projectId/documents',
  authenticatedUser,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Project ID is required' },
        });
      }

      // Verify project belongs to user
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });

      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'File is required' },
        });
      }

      const file = req.file;
      const documentType = getDocumentType(file.originalname);
      const mimeType = getMimeType(file.originalname);

      // Create document record
      const document = await prisma.document.create({
        data: {
          projectId,
          filename: file.originalname,
          mimeType,
          type: documentType,
          status: 'PROCESSING',
          sizeBytes: file.size,
          filePath: file.path,
        },
      });

      // Enqueue processing job
      await documentProcessingQueue.add({ documentId: document.id });

      return res.status(202).json({
        data: {
          id: document.id,
          filename: document.filename,
          mimeType: document.mimeType,
          type: document.type,
          status: document.status,
          sizeBytes: document.sizeBytes,
          chunkCount: document.chunkCount,
          createdAt: document.createdAt,
        },
      });
    } catch (error) {
      console.error('Error uploading document:', error);

      // Handle multer-specific errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 50MB limit' },
          });
        }
        return res.status(400).json({
          error: { code: 'UPLOAD_ERROR', message: error.message },
        });
      }

      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload document' },
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/documents
 * List all documents for a project
 */
router.get(
  '/:projectId/documents',
  authenticatedUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const projectId = req.params.projectId;
      if (!projectId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Project ID is required' },
        });
      }

      // Verify project belongs to user
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });

      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const documents = await prisma.document.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          type: true,
          status: true,
          sizeBytes: true,
          chunkCount: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.json({ data: documents });
    } catch (error) {
      console.error('Error listing documents:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list documents' },
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/documents/:docId
 * Get a single document by ID
 */
router.get(
  '/:projectId/documents/:docId',
  authenticatedUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const projectId = req.params.projectId;
      const docId = req.params.docId;
      if (!projectId || !docId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Project ID and Document ID are required' },
        });
      }

      // Verify project belongs to user
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });

      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const document = await prisma.document.findFirst({
        where: { id: docId, projectId },
        include: {
          _count: {
            select: { chunks: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      return res.json({
        data: {
          id: document.id,
          filename: document.filename,
          mimeType: document.mimeType,
          type: document.type,
          status: document.status,
          sizeBytes: document.sizeBytes,
          chunkCount: document.chunkCount,
          metadata: document.metadata,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error fetching document:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch document' },
      });
    }
  },
);

/**
 * DELETE /api/projects/:projectId/documents/:docId
 * Delete a document, its chunks, and vector embeddings
 */
router.delete(
  '/:projectId/documents/:docId',
  authenticatedUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const projectId = req.params.projectId;
      const docId = req.params.docId;
      if (!projectId || !docId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Project ID and Document ID are required' },
        });
      }

      // Verify project belongs to user
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });

      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const document = await prisma.document.findFirst({
        where: { id: docId, projectId },
      });

      if (!document) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      // Get chunk IDs for vector store cleanup
      const chunks = await prisma.chunk.findMany({
        where: { documentId: docId },
        select: { id: true },
      });

      // Delete vector embeddings
      if (chunks.length > 0) {
        try {
          const vectorStore = createVectorStore();
          const chunkIds = chunks.map((c) => c.id);
          await vectorStore.delete(`project_${projectId}`, chunkIds);
        } catch (vectorError) {
          // Log but don't fail the deletion — vector cleanup is best-effort
          console.error('Error deleting vector embeddings:', vectorError);
        }
      }

      // Delete chunks and document (chunks first due to FK constraint)
      await prisma.chunk.deleteMany({ where: { documentId: docId } });
      await prisma.document.delete({ where: { id: docId } });

      // Clean up the uploaded file from disk
      try {
        await fs.unlink(document.filePath);
      } catch (fileError) {
        // Log but don't fail — file cleanup is best-effort
        console.error('Error deleting uploaded file:', fileError);
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting document:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete document' },
      });
    }
  },
);

export default router;
