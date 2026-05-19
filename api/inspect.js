import { supabase } from '../src/config/supabase.js';

export default async function handler(req, res) {
  try {
    const tables = ['hospitals', 'doctors', 'patients', 'appointments', 'doctor_slots', 'hospital_media', 'specializations', 'cities', 'states', 'booking_status_master'];
    const results = {};

    for (const table of tables) {
      if (table === 'booking_status_master') {
        const { data, error } = await supabase.from(table).select('*');
        results[table] = error ? { error: error.message } : { data };
        continue;
      }
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        results[table] = { error: error.message };
      } else {
        results[table] = { columns: Object.keys(data[0] || {}) };
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
