import { ROLES } from './roles.js';

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'],
  [ROLES.SOCIETY_ADMIN]: ['society:manage', 'users:manage', 'flats:manage'],
  [ROLES.RESIDENT]: ['profile:read', 'profile:update'],
  [ROLES.SECURITY_GUARD]: ['profile:read'],
  [ROLES.STAFF]: ['profile:read']
};
