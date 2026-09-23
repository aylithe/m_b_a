import { userRoleRepository } from '../repositories/user.role.repository';

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await userRoleRepository.findRolesWithPermissionsByUserId(userId);
  const permissions = userRoles
    .map((ur) => ur.role.permissions.map((perm) => perm.permission.name))
    .flat();
  return Array.from(new Set(permissions));
}
