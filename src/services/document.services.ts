import { getUserPermissions } from './rbac.services';
import { documentRepository } from '../repositories';
import { NotFoundError } from '../lib/errors';
import { appEvents } from '../lib/events';
import { DOC_EVENTS } from '../events/document.events';

export async function getDocument(documentId: string, userId: string) {
  const doc = await documentRepository.findById(documentId);

  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  // Resource ownership check
  if (doc.userId !== userId) {
    // Admins can see everything
    const permissions = await getUserPermissions(userId);
    if (!permissions.includes('users:manage')) {
      throw new NotFoundError('Document not found');
    }
  }
  return doc;
}

export interface ListDocumentsOptions {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  sortBy?: 'createdAt' | 'title' | 'chunkCount';
  sortOrder?: 'asc' | 'desc';
}

export async function createDocument(data: {
  userId: string;
  title: string;
  content: string;
  description?: string;
  status?: 'pending' | 'processing' | 'ready' | 'failed';
}) {
  const doc = await documentRepository.create(data);
  appEvents.emit(DOC_EVENTS.CREATED, {
    userId: data.userId,
    documentId: doc.id,
    title: doc.title,
    //fileSizeBytes: doc.fileSizeBytes,
  });
  return doc;
}

export async function listDocuments(userId: string, options: ListDocumentsOptions) {
  const { page, limit, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  // Build the where clause dynamically
  const where: any = {
    userId,
    deletedAt: null, // Soft delete filter (we'll add this today)
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
    where.description = { contains: search, mode: 'insensitive' };
  }

  const [documents, total] = await Promise.all([
    documentRepository.listDocumentsByUserId(where, { page, limit, sortBy, sortOrder }),
    documentRepository.countDocumentsByUserId(where),
  ]);

  return {
    data: documents,
    meta: { page, limit, total },
  };
}

export async function deleteDocument(documentId: string, userId: string) {
  const doc = await documentRepository.findById(documentId);

  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  // Resource ownership check
  if (doc.userId !== userId) {
    // Admins can delete everything
    const permissions = await getUserPermissions(userId);
    if (!permissions.includes('users:manage')) {
      throw new NotFoundError('Document not found');
    }
  }

  const deletedDoc = await documentRepository.deleteDocument(documentId, userId);
  appEvents.emit(DOC_EVENTS.DELETED, {
    userId,
    documentId: deletedDoc.id,
    title: deletedDoc.title,
  });
  return deletedDoc;
}
