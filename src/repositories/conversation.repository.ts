import { prisma } from '../lib/prisma';

export const conversationRepository = {
  async create(data: { userId: string; title: string }) {
    return prisma.conversation.create({ data });
  },
  async listConversations(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;

    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  },
  async countConversations(userId: string) {
    return prisma.conversation.count({ where: { userId } });
  },
};
