import * as doctorRepository from '../repositories/doctorRepository.js';

export const getDoctorsList = async (queryParams) => {
  const { search, specialization, hospital_id, page = '1', limit = '10', sort = 'asc' } = queryParams;

  // Pagination math
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
  const offset = (pageNumber - 1) * limitNumber;

  const validSort = ['asc', 'desc'].includes(sort.toLowerCase()) ? sort.toLowerCase() : 'asc';

  const result = await doctorRepository.getDoctors({
    search: search ? search.trim() : null,
    specialization: specialization ? specialization.trim() : null,
    hospital_id: hospital_id || null,
    limit: limitNumber,
    offset,
    sortOrder: validSort
  });

  const totalPages = Math.ceil(result.count / limitNumber);

  return {
    data: result.data,
    meta: {
      totalCount: result.count,
      currentPage: pageNumber,
      totalPages: totalPages === 0 ? 1 : totalPages,
      limit: limitNumber
    }
  };
};
