export const STAFF_CATEGORIES = {
  MAID: 'maid',
  COOK: 'cook',
  DRIVER: 'driver',
  NANNY: 'nanny',
  CAR_CLEANER: 'car_cleaner',
  GARDENER: 'gardener',
  ELECTRICIAN: 'electrician',
  PLUMBER: 'plumber',
  SECURITY: 'security',
  OTHER: 'other'
};

export const STAFF_CATEGORY_VALUES = Object.values(STAFF_CATEGORIES);

export const STAFF_STATUSES = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive'
};

export const STAFF_STATUS_VALUES = Object.values(STAFF_STATUSES);

export const ATTENDANCE_ACTIONS = {
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out'
};

export const ATTENDANCE_ACTION_VALUES = Object.values(ATTENDANCE_ACTIONS);

export const WAGE_PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled'
};

export const WAGE_PAYMENT_STATUS_VALUES = Object.values(WAGE_PAYMENT_STATUSES);
