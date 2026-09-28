import { NotFoundError } from '../lib/errors';
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
  async messageSaveTransaction(data: {
    conversationId: string;
    userId: string;
    content: string;
    documentId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify the conversation belongs to this user
      const conversation = await tx.conversation.findUnique({
        where: { id: data.conversationId, userId: data.userId },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      // 2. Create the user's message
      const userMessage = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          documentId: data.documentId || '',
          role: 'user',
          content: data.content,
        },
      });

      // 3. Touch the conversation's updatedAt
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      const assistantMessage = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          documentId: data.documentId || '',
          role: 'assistant',
          content: 'AI response placeholder (Week 4)',
          promptTokens: 0,
          completionTokens: 0,
          costUsd: 0,
        },
      });

      // 5. Log usage
      await tx.usageLog.create({
        data: {
          userId: data.userId,
          action: 'chat',
          tokens: 0, // Placeholder until Week 4
          costUsd: 0,
        },
      });

      return { userMessage, assistantMessage };
    });
  },
};
