import { supabase } from './src/config/supabase.js';

async function checkSchema() {
  console.log('--- Checking Schema Relationships ---');
  try {
    // Check Hospitals
    const { data: hospCols, error: hospErr } = await supabase.from('hospitals').select('*').limit(1);
    if (!hospErr) console.log('Hospitals columns:', Object.keys(hospCols[0] || {}));
    
    // Check Doctors
    const { data: docCols, error: docErr } = await supabase.from('doctors').select('*').limit(1);
    if (!docErr) console.log('Doctors columns:', Object.keys(docCols[0] || {}));

    // Check Appointments
    const { data: aptCols, error: aptErr } = await supabase.from('appointments').select('*').limit(1);
    if (!aptErr) console.log('Appointments columns:', Object.keys(aptCols[0] || {}));

    // Check Media
    const { data: mediaCols, error: mediaErr } = await supabase.from('hospital_media').select('*').limit(1);
    if (!mediaErr) console.log('HospitalMedia columns:', Object.keys(mediaCols[0] || {}));

    // Check Specializations
    const { data: specCols, error: specErr } = await supabase.from('specializations').select('*').limit(1);
    if (!specErr) console.log('Specialization columns:', Object.keys(specCols[0] || {}));

    // Check Cities/States
    const { data: cityCols, error: cityErr } = await supabase.from('cities').select('*').limit(1);
    if (!cityErr) console.log('Cities columns:', Object.keys(cityCols[0] || {}));

  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkSchema();
