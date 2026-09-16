import { prisma } from '../lib/prisma';

export const usageLogRepository = {
  async create(data: {
    userId: string;
    action: string;
    tokens: number;
    costUsd: number;
    metadata: Record<string, string | number | boolean | Date | null | undefined>;
  }) {
    return prisma.usageLog.create({ data });
  },
};
