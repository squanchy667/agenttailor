import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import apiRouter from './routes/index.js';
import gptRouter from './routes/gptActions.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startDocumentWorker } from './workers/documentWorker.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (unprotected)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'agenttailor-api',
  });
});

// Mount API routes (Clerk auth)
app.use('/api', apiRouter);

// Mount GPT Action routes (API key auth, separate from Clerk)
app.use('/gpt', gptRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Global error handler
app.use(errorHandler);

// Start document processing worker
startDocumentWorker();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API info: http://localhost:${PORT}/api/v1/info`);
});

export default app;
