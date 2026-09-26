import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/authorize';
import { getAllRoles } from '../services/role.services';
import { assignRoleToUser } from '../services/admin.services';
import { roleRepository, userRoleRepository } from '../repositories';
import { NotFoundError } from '../lib/errors';
import { appEvents } from '../lib/events';

const router = Router();
router.use(authenticate);
router.use(requirePermissions('roles:manage'));

// List all roles with their permissions
router.get('/roles', async (_req, res) => {
  const roles = await getAllRoles();

  res.json({
    success: true,
    data: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.name),
    })),
  });
});

// Assign a role to a user
router.post('/users/:userId/roles', async (req, res, next) => {
  try {
    const roleName = req.body.roleName;

    await assignRoleToUser({
      userId: req.params.userId,
      roleName,
      updatingUserId: req.user!.id,
    });

    res.json({
      success: true,
      data: { message: `Role '${roleName}' assigned to user` },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:userId/roles/:roleName', async (req, res, next) => {
  try {
    const { userId, roleName } = req.params;

    const role = await roleRepository.findByName(roleName);
    if (!role) throw new NotFoundError('Role not found');

    await userRoleRepository.deleteUserRole({
      userId,
      roleId: role.id,
    });

    appEvents.emit('admin:role-revoked', {
      targetUserId: userId,
      roleName,
      revokedBy: req.user!.id,
    });

    res.json({
      success: true,
      data: { message: `Role '${roleName}' revoked` },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
