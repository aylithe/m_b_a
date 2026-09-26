import { appEvents } from '../lib/events';
import { prisma } from '../lib/prisma';
import { usageLogRepository } from '../repositories';

appEvents.on('admin:role-assigned', async (data) => {
  try {
    await usageLogRepository.create({
      userId: data.assignedBy,
      action: 'role_assigned',
      tokens: 0,
      costUsd: 0,
      metadata: {
        targetUserId: data.targetUserId,
        roleName: data.roleName,
        assignedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log role assignment:', error);
  }
});

appEvents.on('admin:role-revoked', async (data) => {
  try {
    await usageLogRepository.create({
      userId: data.revokedBy,
      action: 'role_revoked',
      tokens: 0,
      costUsd: 0,
      metadata: {
        targetUserId: data.targetUserId,
        roleName: data.roleName,
        revokedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log role revocation:', error);
  }
});
