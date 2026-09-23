import { getUserPermissions } from './rbac.services';
import { documentRepository } from '../repositories';
import { NotFoundError } from '../lib/errors';

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
