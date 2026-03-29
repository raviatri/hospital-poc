import { supabase } from '../config/supabase.js';

export const findAppointments = async ({ 
  hospital_id, 
  doctor_id, 
  date, 
  status_id, 
  search, 
  limit, 
  offset, 
  sortBy, 
  sortOrder 
}) => {
  let query = supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      time_slot,
      doctor_id,
      patient_id,
      status_id,
      doctors(name),
      patients(name, mobile),
      booking_status_master(code)
    `, { count: 'exact' });

  if (hospital_id) {
    query = query.eq('hospital_id', hospital_id);
  }

  if (doctor_id) {
    query = query.eq('doctor_id', doctor_id);
  }

  if (date) {
    query = query.eq('appointment_date', date);
  }

  if (status_id) {
    query = query.eq('status_id', status_id);
  }

  if (search) {
    // Search in patient names or mobile via join
    query = query.or(`patients.name.ilike.%${search}%,patients.mobile.ilike.%${search}%`);
  }

  const ascending = sortOrder === 'asc';
  query = query.order(sortBy || 'appointment_date', { ascending });
  
  // Secondary sort by time_slot
  query = query.order('time_slot', { ascending: true });

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  // Format response as requested
  const formattedData = data.map(apt => ({
    appointment_id: apt.id,
    doctor_name: apt.doctors ? apt.doctors.name : null,
    patient_name: apt.patients ? apt.patients.name : null,
    appointment_date: apt.appointment_date,
    time_slot: apt.time_slot,
    status: apt.booking_status_master ? apt.booking_status_master.code : null
  }));

  return {
    data: formattedData,
    count: count || 0
  };
};
