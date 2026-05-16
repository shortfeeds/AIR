/**
 * Pagination Utility
 * Standardizes offset-based pagination across the API
 */

/**
 * Get pagination parameters from request query
 * @param {Object} query - req.query object
 * @param {number} defaultLimit - default number of items per page
 * @returns {Object} { limit, offset, page }
 */
const getPagination = (query, defaultLimit = 50) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || defaultLimit;
  const offset = (page - 1) * limit;

  return {
    limit,
    offset,
    page
  };
};

/**
 * Format paginated response
 * @param {Array} rows - data rows
 * @param {number} total - total count of items
 * @param {number} page - current page
 * @param {number} limit - items per page
 * @returns {Object} paginated response object
 */
const formatPaginated = (rows, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

module.exports = {
  getPagination,
  formatPaginated
};
