import { CACHE_TTL, cacheGetOrSet } from '../lib/cache';
import { userRoleRepository } from '../repositories/user.role.repository';

async function getUserPermissionsFromDb(userId: string): Promise<string[]> {
  const userRoles = await userRoleRepository.findRolesWithPermissionsByUserId(userId);
  const permissions = userRoles
    .map((ur) => ur.role.permissions.map((perm) => perm.permission.name))
    .flat();
  return Array.from(new Set(permissions));
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const permissions = await cacheGetOrSet(
    `permissions:${userId}`,
    CACHE_TTL.PERMISSIONS,
    async () => {
      return getUserPermissionsFromDb(userId);
    },
  );

  return [...new Set(permissions)];
}
