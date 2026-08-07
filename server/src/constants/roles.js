export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SOCIETY_ADMIN: 'society_admin',
  RESIDENT: 'resident',
  SECURITY_GUARD: 'security_guard',
  STAFF: 'staff'
};

export const ROLE_VALUES = Object.values(ROLES);

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SOCIETY_ADMIN];
