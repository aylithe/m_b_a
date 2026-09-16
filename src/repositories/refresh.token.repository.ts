import { prisma } from '../lib/prisma';

export const refreshTokenRepository = {
  async create(data: { userId: string; token: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },
};
