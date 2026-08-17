export const GUARD_STATUSES = {
  OFF_DUTY: 'off_duty',
  ON_DUTY: 'on_duty',
  ON_PATROL: 'on_patrol'
};

export const GUARD_STATUS_VALUES = Object.values(GUARD_STATUSES);

export const SHIFT_ACTIONS = {
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out'
};

export const SHIFT_ACTION_VALUES = Object.values(SHIFT_ACTIONS);

export const ALERT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const ALERT_SEVERITY_VALUES = Object.values(ALERT_SEVERITIES);

export const INCIDENT_CATEGORIES = {
  SECURITY: 'security',
  FIRE: 'fire',
  MEDICAL: 'medical',
  THEFT: 'theft',
  PROPERTY_DAMAGE: 'property_damage',
  OTHER: 'other'
};

export const INCIDENT_CATEGORY_VALUES = Object.values(INCIDENT_CATEGORIES);

export const INCIDENT_STATUSES = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved'
};

export const INCIDENT_STATUS_VALUES = Object.values(INCIDENT_STATUSES);
