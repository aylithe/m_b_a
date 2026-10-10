import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { prisma } from '../lib/prisma';
import { appEvents } from '../lib/events';
import { estimateTokens, splitIntoChunks } from '../lib/chunker';
import { deadLetterQueue } from './dead-letter.queue';
import { logger } from '../lib/logger';

const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, userId, correlationId } = job.data;
    logger.info('Processing document', {
      jobId: job.id,
      documentId,
      userId,
      correlationId,
      attempt: job.attemptsMade + 1,
    });

    // Step 1: Fetch the document content
    const doc = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    // Mark as processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });

    try {
      await job.updateProgress(10);

      // Step 2: Split into chunks
      const chunks = splitIntoChunks(doc.content, 500);
      await job.updateProgress(40);

      // Step 3: Store chunks in the database
      await prisma.$transaction(async (tx) => {
        // Delete any existing chunks (in case of retry)
        await tx.chunk.deleteMany({ where: { documentId } });

        await tx.chunk.createMany({
          data: chunks.map((text, index) => ({
            documentId,
            index,
            content: text,
            tokenCount: estimateTokens(text),
          })),
        });

        await tx.document.update({
          where: { id: documentId },
          data: { status: 'ready', chunkCount: chunks.length },
        });
      });
      await job.updateProgress(100);
      // Emit event for audit/notification
      appEvents.emit('doc:processed', {
        documentId,
        userId,
        correlationId,
        chunkCount: chunks.length,
      });

      return { success: true, chunks: chunks.length };
    } catch (error) {
      // Only mark as failed on the LAST attempt
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'failed',
            error: (error as Error).message,
          },
        });
      }
      throw error; // Re-throw so BullMQ retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
);

// Event listeners for logging
worker.on('completed', (job) => {
  logger.info('Document job completed', {
    jobId: job.id,
    documentId: job.data?.documentId,
    userId: job.data?.userId,
    correlationId: job.data?.correlationId,
    chunks: job.returnvalue?.chunks,
  });
});

worker.on('failed', async (job, error) => {
  logger.error('Document job failed', {
    jobId: job?.id,
    documentId: job?.data?.documentId,
    userId: job?.data?.userId,
    correlationId: job?.data?.correlationId,
    attempt: job?.attemptsMade,
    error: error.message,
  });
  if (!job) return;

  // Check if all attempts exhausted
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    logger.error('Document job permanently failed; moving to DLQ', {
      jobId: job.id,
      documentId: job.data?.documentId,
      userId: job.data?.userId,
      correlationId: job.data?.correlationId,
      attempts: job.attemptsMade,
    });

    await deadLetterQueue.add('failed-document', {
      originalJobId: job.id,
      originalQueue: 'document-processing',
      data: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
    });
  }
});

worker.on('error', (error) => {
  logger.error('Document worker error', {
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
});

export { worker };
