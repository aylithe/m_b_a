import { appEvents } from '../lib/events';
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
    console.error('Failed to log document creation:', error);
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
    console.error('Failed to log document deletion:', error);
  }
});
