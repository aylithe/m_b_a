import { appEvents } from '../lib/events';
import { logger } from '../lib/logger';
import { usageLogRepository } from '../repositories/usage.log.repository';

export const DOC_EVENTS = {
  CREATED: 'doc:created',
  PROCESSED: 'doc:processed',
  DELETED: 'doc:deleted',
} as const;

appEvents.on(DOC_EVENTS.CREATED, async (data) => {
  try {
    await usageLogRepository.create({
      userId: data.createdBy,
      action: 'document_created',
      tokens: 0,
      costUsd: 0,
      metadata: {
        documentId: data.documentId,
        title: data.title,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to log document creation', {
      userId: data.userId,
      documentId: data.documentId,
      title: data.title,
      correlationId: data.correlationId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
});

appEvents.on(DOC_EVENTS.DELETED, async (data) => {
  try {
    await usageLogRepository.create({
      userId: data.deletedBy,
      action: 'document_deleted',
      tokens: 0,
      costUsd: 0,
      metadata: {
        documentId: data.documentId,
        title: data.title,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to log document deletion', {
      userId: data.userId,
      documentId: data.documentId,
      title: data.title,
      correlationId: data.correlationId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
});
