export const normalizePhone = (value) => {
  if (!value) return value;
  const trimmed = String(value).trim();
  return trimmed.startsWith('+') ? trimmed : `+91${trimmed.replace(/^0+/, '')}`;
};
