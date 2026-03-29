import { supabase } from '../src/config/supabase.js';

export default async function handler(req, res) {
  try {
    const tables = ['hospitals', 'doctors', 'patients', 'appointments', 'doctor_slots', 'hospital_media', 'specializations', 'cities', 'states'];
    const results = {};

    for (const table of tables) {
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
