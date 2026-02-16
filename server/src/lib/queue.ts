import Bull from 'bull';

export interface DocumentJobData {
  documentId: string;
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const documentProcessingQueue = new Bull<DocumentJobData>(
  'document-processing',
  redisUrl,
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
);
