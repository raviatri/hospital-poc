import * as appointmentRepository from '../repositories/appointmentRepository.js';

export const getAppointmentsList = async (queryParams) => {
  const { 
    hospital_id, 
    doctor_id, 
    date, 
    status_id, 
    search, 
    page = '1', 
    limit = '10', 
    sortBy = 'appointment_date', 
    sortOrder = 'asc' 
  } = queryParams;

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
  const offset = (pageNumber - 1) * limitNumber;

  const result = await appointmentRepository.findAppointments({
    hospital_id: hospital_id || null,
    doctor_id: doctor_id || null,
    date: date || null,
    status_id: status_id || null,
    search: search ? search.trim() : null,
    limit: limitNumber,
    offset,
    sortBy,
    sortOrder: sortOrder.toLowerCase()
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
