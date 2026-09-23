import { appEvents } from '../lib/events';
import { userRepository, roleRepository, userRoleRepository } from '../repositories';
import { NotFoundError } from '../lib/errors';

export async function assignRoleToUser({
  userId,
  roleName,
  updatingUserId,
}: {
  userId: string;
  roleName: string;
  updatingUserId: string;
}) {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const role = await roleRepository.findByName(roleName);
  if (!role) throw new NotFoundError(`Role '${roleName}' not found`);

  await userRoleRepository.upsertUserRole({
    userId,
    roleId: role.id,
    updatingUserId, // Assuming the user is assigning the role to themselves
  });

  // Audit event
  appEvents.emit('admin:role-assigned', {
    targetUserId: userId,
    roleName,
    assignedBy: updatingUserId,
  });
}
