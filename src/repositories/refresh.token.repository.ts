import { prisma } from '../lib/prisma';

export const refreshTokenRepository = {
  async create(data: { userId: string; token: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },
  async findByToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
    });
  },
  async delete(where: { token: string }) {
    return prisma.refreshToken.deleteMany({ where });
  },
};
