import { supabase } from '../config/supabase.js';

export const findHospitals = async ({ search, limit, offset }) => {
  let query = supabase
    .from('hospitals')
    .select(`
      id, 
      name, 
      address, 
      phone, 
      email, 
      total_beds, 
      total_departments,
      cities(name),
      states(name),
      hospital_media(media_url)
    `, { count: 'exact' })
    .eq('is_active', true);

  // Filter media to only LOGO types (assuming media_type mapping logic)
  // Note: For complex join filtering, we might need a separate call or specific Supabase logic
  // For now, we'll fetch all active media and filter in the service layer or use !inner if we have media_type_id

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  // Format the data to match the requested response (city name, state name, logo_url)
  const formattedData = data.map(hospital => ({
    id: hospital.id,
    name: hospital.name,
    address: hospital.address,
    city: hospital.cities ? hospital.cities.name : null,
    state: hospital.states ? hospital.states.name : null,
    logo_url: hospital.hospital_media && hospital.hospital_media.length > 0 
      ? hospital.hospital_media[0].media_url 
      : null,
    phone: hospital.phone,
    email: hospital.email,
    total_beds: hospital.total_beds,
    total_departments: hospital.total_departments
  }));

  return {
    data: formattedData,
    count: count || 0
  };
};
