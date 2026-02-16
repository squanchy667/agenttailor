import { documentProcessingQueue } from '../lib/queue.js';
import { processDocument } from '../services/documentProcessor.js';

/**
 * Start the Bull worker that processes document jobs.
 * Processes up to 3 concurrent document jobs.
 */
export function startDocumentWorker(): void {
  documentProcessingQueue.process(3, async (job) => {
    const { documentId } = job.data;
    console.log(`Processing document: ${documentId}`);

    await processDocument(documentId);

    console.log(`Document processed: ${documentId}`);
  });

  documentProcessingQueue.on('failed', (job, error) => {
    console.error(`Document job ${job.id} failed:`, error.message);
  });

  documentProcessingQueue.on('completed', (job) => {
    console.log(`Document job ${job.id} completed`);
  });
}
