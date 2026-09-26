import { conversationRepository } from '../repositories';

export async function listConversations(userId: string, options: { page: number; limit: number }) {
  const { page, limit } = options;

  const [conversations, total] = await Promise.all([
    conversationRepository.listConversations(userId, { page, limit }),
    conversationRepository.countConversations(userId),
  ]);

  return {
    data: conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0] || null,
      updatedAt: conv.updatedAt,
    })),
    meta: {
      page,
      limit,
      total,
    },
  };
}
