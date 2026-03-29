import * as slotRepository from '../repositories/slotRepository.js';

export const getAvailableSlots = async (queryParams) => {
  const { doctor_id, hospital_id, date } = queryParams;

  if (!doctor_id || !date) {
    throw new Error('doctor_id and date are required parameters');
  }

  const result = await slotRepository.findAvailableSlots({
    doctor_id,
    hospital_id,
    date
  });

  return {
    data: result
  };
};
