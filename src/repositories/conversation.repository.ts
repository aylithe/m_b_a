import { prisma } from '../lib/prisma';

export const conversationRepository = {
  async create(data: { userId: string; title: string }) {
    return prisma.conversation.create({ data });
  },
};
