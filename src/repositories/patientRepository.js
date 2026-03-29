import { supabase } from '../config/supabase.js';

export const findPatients = async ({ search, hospital_id, limit, offset, sortBy, sortOrder }) => {
  // If hospital_id is provided, we filter patients who have appointments at that hospital
  // We use !inner join to filter out patients without appointments in that hospital
  const selectQuery = hospital_id 
    ? `*, appointments!inner(id, hospital_id)` 
    : `*`;

  let query = supabase
    .from('patients')
    .select(selectQuery, { count: 'exact' });

  if (hospital_id) {
    query = query.eq('appointments.hospital_id', hospital_id);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%`);
  }

  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending });

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  
  if (error) {
    throw error;
  }

  return {
    data,
    count: count || 0
  };
};

