import { supabase } from '../config/supabase.js';

export const findAvailableSlots = async ({ doctor_id, hospital_id, date }) => {
  // Fetch slots where status matches AVAILABLE (using status_id join)
  const { data, error } = await supabase
    .from('doctor_slots')
    .select(`
      id,
      start_time,
      end_time,
      booking_status_master!inner(code)
    `)
    .eq('doctor_id', doctor_id)
    .eq('slot_date', date)
    .eq('booking_status_master.code', 'AVAILABLE')
    .order('start_time', { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(slot => ({
    slot_id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time
  }));
};
