import * as patientRepository from '../repositories/patientRepository.js';

export const getPatientsList = async (queryParams) => {
  const { search, hospital_id, page = '1', limit = '10', sortBy = 'name', sortOrder = 'asc' } = queryParams;

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNumber - 1) * limitNumber;

  const validSortFields = ['name', 'created_at', 'mobile'];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';
  const finalSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'asc';

  const { data, count } = await patientRepository.findPatients({
    search: search ? search.trim() : null,
    hospital_id: hospital_id || null,
    limit: limitNumber,
    offset,
    sortBy: finalSortBy,
    sortOrder: finalSortOrder
  });

  const totalPages = Math.ceil(count / limitNumber);

  return {
    data,
    meta: {
      totalCount: count,
      currentPage: pageNumber,
      totalPages: totalPages === 0 ? 1 : totalPages,
      limit: limitNumber
    }
  };
};
