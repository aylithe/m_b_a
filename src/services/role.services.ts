import { roleRepository } from '../repositories/role.repository';

export async function getAllRoles() {
  return roleRepository.findRoles();
}
