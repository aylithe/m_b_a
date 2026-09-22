import { prisma } from '../lib/prisma';

export const userRoleRepository = {
  async create(data: { userId: string; roleId: string }) {
    return prisma.userRole.create({ data });
  },
  async findRolesWithPermissionsByUserId(userId: string) {
    return prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  },
  async upsertUserRole({
    userId,
    roleId,
    updatingUserId,
  }: {
    userId: string;
    roleId: string;
    updatingUserId: string;
  }) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: {
        userId,
        roleId: roleId,
        assignedBy: updatingUserId,
      },
    });
  },
};
