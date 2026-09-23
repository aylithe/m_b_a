import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/authorize';
import { getAllRoles } from '../services/role.services';
import { assignRoleToUser } from '../services/admin.services';

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

export default router;
