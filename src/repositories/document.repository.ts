import { prisma } from '../lib/prisma';
import { ListDocumentsOptions } from '../services/document.services';

export const documentRepository = {
  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
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
};
