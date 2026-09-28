import { conversationRepository, documentRepository } from '../repositories';

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

export async function sendMessage(data: {
  conversationId: string;
  userId: string;
  content: string;
  documentId?: string;
}) {
  const doc = await documentRepository.findById(data?.documentId || '');
  if (!doc) {
    throw new Error('Document not found');
  }

  return conversationRepository.messageSaveTransaction(data);
}
