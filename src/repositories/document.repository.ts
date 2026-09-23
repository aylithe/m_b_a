import { prisma } from '../lib/prisma';

export const documentRepository = {
  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
    });
  },
};
