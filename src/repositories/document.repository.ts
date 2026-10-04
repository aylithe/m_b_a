import { prisma } from '../lib/prisma';
import { ListDocumentsOptions } from '../services/document.services';

export const documentRepository = {
  async create(data: { userId: string; title: string; content: string }) {
    return prisma.document.create({
      data: {
        userId: data.userId,
        title: data.title,
        filename: data.title.toLowerCase().replace(/\s+/g, '-'),
        content: data.content,
        status: 'pending',
        chunkCount: 0,
      },
    });
  },
  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id, deletedAt: null },
    });
  },
  async listDocumentsByUserId(where: ListDocumentsOptions, options: ListDocumentsOptions) {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = options;
    return prisma.document.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        filename: true,
        status: true,
        chunkCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
  async countDocumentsByUserId(where: ListDocumentsOptions) {
    return prisma.document.count({ where });
  },
  async deleteDocument(id: string, userId: string) {
    return prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  },
  async findActiveDocumentJob(documentId: string) {
    return prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, status: true, error: true, userId: true },
    });
  },
};
