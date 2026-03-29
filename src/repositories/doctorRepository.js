import { supabase } from '../config/supabase.js';

export const getDoctors = async ({ search, specialization, hospital_id, limit, offset, sortOrder }) => {
  
  // Joins: doctors -> specializations
  let query = supabase
    .from('doctors')
    .select(`
      id, 
      name, 
      is_active, 
      created_at, 
      specializations(id, name)
    `, { count: 'exact' })
    .eq('is_active', true);

  if (hospital_id) {
    query = query.eq('hospital_id', hospital_id);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (specialization) {
    query = query.ilike('specializations.name', `%${specialization}%`);
  }

  const ascending = sortOrder === 'asc';
  query = query.order('name', { ascending });

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  
  if (error) {
    throw error;
  }

  const formattedData = data.map(doctor => ({
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    specialization: doctor.specializations ? doctor.specializations.name : null,
    hospital_id: doctor.hospital_id || hospital_id
  }));

  return {
    data: formattedData,
    count: count || 0
  };
};

