export const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const paginatedPayload = ({ items, total, page, limit }) => ({
  items,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  }
});
