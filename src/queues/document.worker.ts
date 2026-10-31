import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { prisma } from '../lib/prisma';
import { appEvents } from '../lib/events';
import { chunkDocument, estimateTokens, splitIntoChunks } from '../lib/chunker';
import { deadLetterQueue } from './dead-letter.queue';
import { logger } from '../lib/logger';
import { detectFormat, extractText } from '../lib/documentExtractor';
import {
  generateEmbeddingsBatchCached,
  storeChunkEmbeddingsBatch,
} from '../services/embedding.service';

const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, userId, correlationId } = job.data;
    const startTime = Date.now();

    logger.info('Document processing started', {
      correlationId,
      documentId,
      userId,
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });

    try {
      // Step 1: Fetch document
      const doc = await prisma.document.findUniqueOrThrow({
        where: { id: documentId },
      });
      await job.updateProgress(5);

      // Step 2: Extract text
      const format = detectFormat(doc.filename);
      const { text, pageCount } = await extractText(doc.content, format);
      await job.updateProgress(15);

      logger.info('Text extracted', {
        correlationId,
        documentId,
        format,
        textLength: text.length,
        pageCount,
      });
      // Step 3: Chunk the text
      const chunks = chunkDocument(text, {
        maxTokens: 500,
        overlapTokens: 50,
        minChunkTokens: 50,
      });
      await job.updateProgress(30);

      logger.info('Document chunked', {
        correlationId,
        documentId,
        chunkCount: chunks.length,
        avgTokens: Math.round(chunks.reduce((sum, c) => sum + c.tokenEstimate, 0) / chunks.length),
      });

      // Step 4: Store chunks in database
      await prisma.$transaction(async (tx) => {
        await tx.chunk.deleteMany({ where: { documentId } });
        await tx.chunk.createMany({
          data: chunks.map((chunk) => ({
            documentId,
            index: chunk.index,
            content: chunk.text,
            tokenCount: chunk.tokenEstimate,
          })),
        });
      });
      await job.updateProgress(50);

      // Step 5: Generate embeddings (the expensive step)
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await generateEmbeddingsBatchCached(chunkTexts);
      await job.updateProgress(85);

      // Step 6: Store embeddings
      const storedChunks = await prisma.chunk.findMany({
        where: { documentId },
        orderBy: { index: 'asc' },
        select: { id: true },
      });

      await storeChunkEmbeddingsBatch(
        storedChunks.map((c, i) => ({
          id: c.id,
          embedding: embeddings[i],
        })),
      );
      await job.updateProgress(95);

      // Step 7: Mark complete
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ready',
          chunkCount: chunks.length,
        },
      });
      await job.updateProgress(100);
      const duration = Date.now() - startTime;

      // Emit completion event with metrics
      appEvents.emit('doc:processed', {
        documentId,
        userId,
        correlationId,
        chunkCount: chunks.length,
        durationMs: duration,
        format,
        pageCount,
      });

      logger.info('Document processing complete', {
        correlationId,
        documentId,
        chunkCount: chunks.length,
        durationMs: duration,
      });

      return {
        success: true,
        chunks: chunks.length,
        durationMs: duration,
      };
    } catch (error) {
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'failed',
            error: (error as Error).message,
          },
        });
      }
      logger.error('Document processing failed', {
        correlationId,
        documentId,
        error: (error as Error).message,
        attempt: job.attemptsMade + 1,
      });
      throw error;
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
