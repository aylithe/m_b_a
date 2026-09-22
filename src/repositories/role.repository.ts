import { prisma } from '../lib/prisma';

export const roleRepository = {
  async findDefault() {
    return prisma.role.findFirst({ where: { isDefault: true } });
  },
  async findRoles() {
    return prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
  },
  async findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },
};
