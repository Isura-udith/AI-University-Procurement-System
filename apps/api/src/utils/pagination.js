/**
 * Pagination Utility
 */
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = query.sort || '-createdAt';
  return { page, limit, skip, sort };
};

const getFilters = (query, allowedFields = []) => {
  const filters = {};
  allowedFields.forEach(field => {
    if (query[field] !== undefined && query[field] !== '') {
      filters[field] = query[field];
    }
  });
  if (query.search) {
    filters.$text = { $search: query.search };
  }
  return filters;
};

module.exports = { getPagination, getFilters };
