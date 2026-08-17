export const BILL_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

export const BILL_STATUS_VALUES = Object.values(BILL_STATUSES);

export const PAYMENT_STATUSES = {
  CREATED: 'created',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUSES);

export const PAYMENT_METHODS = {
  CARD: 'card',
  UPI: 'upi',
  NETBANKING: 'netbanking',
  WALLET: 'wallet',
  CASH: 'cash',
  CHEQUE: 'cheque',
  OTHER: 'other'
};

export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS);

export const EXPENSE_CATEGORIES = {
  VENDOR_PAYMENT: 'vendor_payment',
  UTILITY: 'utility',
  REPAIR: 'repair',
  SECURITY: 'security',
  HOUSEKEEPING: 'housekeeping',
  AMENITY: 'amenity',
  OTHER: 'other'
};

export const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES);
