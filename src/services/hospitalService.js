import * as hospitalRepository from '../repositories/hospitalRepository.js';

export const getHospitalsList = async (queryParams) => {
  const { search, page = '1', limit = '10' } = queryParams;

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
  const offset = (pageNumber - 1) * limitNumber;

  const result = await hospitalRepository.findHospitals({
    search: search ? search.trim() : null,
    limit: limitNumber,
    offset
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
