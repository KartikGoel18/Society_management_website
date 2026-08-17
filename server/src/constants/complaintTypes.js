export const COMPLAINT_CATEGORIES = {
  PLUMBING: 'plumbing',
  ELECTRICAL: 'electrical',
  SECURITY: 'security',
  HOUSEKEEPING: 'housekeeping',
  LIFT: 'lift',
  PARKING: 'parking',
  AMENITY: 'amenity',
  BILLING: 'billing',
  OTHER: 'other'
};

export const COMPLAINT_CATEGORY_VALUES = Object.values(COMPLAINT_CATEGORIES);

export const COMPLAINT_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

export const COMPLAINT_STATUS_VALUES = Object.values(COMPLAINT_STATUSES);
