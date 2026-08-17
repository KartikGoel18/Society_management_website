export const VISITOR_TYPES = {
  GUEST: 'guest',
  DELIVERY: 'delivery',
  CAB: 'cab',
  DOMESTIC_HELP: 'domestic_help',
  VENDOR: 'vendor',
  SERVICE_PERSONNEL: 'service_personnel'
};

export const VISITOR_TYPE_VALUES = Object.values(VISITOR_TYPES);

export const VISITOR_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  LEFT_AT_GATE: 'left_at_gate'
};

export const VISITOR_STATUS_VALUES = Object.values(VISITOR_STATUSES);
