import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel Environment Variables)
const supabaseUrl = process.env.SUPABASE_URL || 'https://pyqjwkdtkvpflxocelpp.supabase.co';
// We prefer the SERVICE_ROLE_KEY to bypass Row Level Security (RLS) policies
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// In-Memory Session Storage
// Note: For a POC, this securely tracks a user's multi-step flow while the serverless function is warm.
const sessions = {}; 

// DTO Class to parse the incoming webhook request and extract relevant data
class WebhookRequestDTO {
  constructor(body) {
    this.isMessageEvent = false;
    this.userMobile = 'unknown';
    this.messageText = null;
    this.messageType = null;
    this.rawBody = body;
    
    this.parse(body || {});
  }

  parse(body) {
    // 1. WhatsApp Business Account / Meta Graph API Format
    if (body.object === 'whatsapp_business_account' && Array.isArray(body.entry)) {
      const entry = body.entry[0];
      if (entry && Array.isArray(entry.changes)) {
        const value = entry.changes[0].value;
        if (value && Array.isArray(value.messages)) {
          const msg = value.messages[0];
          this.isMessageEvent = true;
          this.userMobile = msg.from;
          this.messageType = msg.type;
          
          if (this.messageType === 'text' && msg.text) {
            this.messageText = msg.text.body;
          }
          return;
        } else {
          this.isMessageEvent = false; return;
        }
      }
    }
    
    // 2. Legacy Gupshup payload format
    if (body.type === 'message') {
      this.isMessageEvent = true;
      this.userMobile = body.mobile || body.payload?.source || 'unknown';
      this.messageText = body.text || body.payload?.payload?.text;
    } else if (body.type && body.type !== 'message') {
      this.isMessageEvent = false;
    } else if (body.text) {
      // 3. Simple custom test JSON format
      this.isMessageEvent = true;
      this.userMobile = body.mobile || 'unknown';
      this.messageText = body.text;
    }
  }
}


export default async function handler(req, res) {
  // Allow GET requests for webhook URL verification
  if (req.method === 'GET') {
    return res.status(200).send('Webhook is active');
  }

  // Only allow POST requests for actual messages/events
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('Incoming webhook request:', JSON.stringify(req.body, null, 2));

  const dto = new WebhookRequestDTO(req.body);

  if (!dto.isMessageEvent) {
    return res.status(200).send('Event received');
  }
  
  if (typeof dto.messageText !== 'string' || !dto.messageText) {
    return res.status(200).send('Webhook is ready to receive events');
  }

  const userMobile = dto.userMobile;
  const msgText = dto.messageText.trim();
  const msgLower = msgText.toLowerCase();

  // Reset conversation if user says Hi/Hello/Hey
  const isGreeting = ['hi', 'hello', 'hey'].includes(msgLower);
  if (!sessions[userMobile] || isGreeting) {
    sessions[userMobile] = { step: 'welcome' };
  }

  const session = sessions[userMobile];
  let responseMessage = "Type 'Hi' to start";

  // State Machine logic
  if (isGreeting) {
    responseMessage = "Welcome to ABC Hospital🏥\n\nPlease send '1' to book an appointment.";
    session.step = 'awaiting_1';
  } 
  else if (session.step === 'awaiting_1' && msgLower === '1') {
    // DB: Fetch doctors list
    const { data: doctors, error } = await supabase.from('doctors').select('id, name');
    
    if (error) {
      console.error("❌ Supabase DB Read Error (doctors):", error.message || error);
    } else {
      console.log(`✅ Supabase DB Read Success (doctors): Fetched ${doctors.length} rows`);
    }

    if (error || !doctors || doctors.length === 0) {
      responseMessage = "Sorry, no doctors are currently available. Please try later.";
    } else {
      let docList = doctors.map(d => `- ${d.name}`).join('\n');
      responseMessage = `Here are our available doctors:\n${docList}\n\nPlease send the Doctor Name for selection.`;
      session.step = 'doctor_selection';
    }
  }
  else if (session.step === 'doctor_selection') {
    // DB: Verify & select doctor
    const { data: doctors, error } = await supabase.from('doctors')
      .select('id, name')
      .ilike('name', `%${msgText}%`); // flexible matching

    if (doctors && doctors.length > 0) {
      session.doctorId = doctors[0].id; // Save doctor ID to session
      responseMessage = `Great, you selected ${doctors[0].name}.\n\nPlease reply with the patient's Name and Mobile Number, separated by a comma.\n(For example: John Doe, 919876543210)`;
      session.step = 'patient_details';
    } else {
      responseMessage = `We couldn't find a doctor named "${msgText}". Please type the exact name from the list.`;
    }
  }
  else if (session.step === 'patient_details') {
    // Parse Name and Mobile
    const parts = msgText.split(',');
    if (parts.length < 2) {
      responseMessage = "Invalid format. Please ensure you send the Name and Mobile separated by a comma (e.g. John Doe, 919876543210).";
    } else {
      const pName = parts[0].trim();
      const pMobile = parts[1].trim();

      // DB: Create patient
      const { data: patient, error } = await supabase.from('patients')
        .insert([{ name: pName, mobile: pMobile }])
        .select('*')
        .single();
        
      if (error) {
        console.error("❌ Supabase DB Write Error (patients):", error.message || error);
        responseMessage = "Oops! We encountered an issue saving the patient record. Please try again.";
      } else {
        console.log(`✅ Supabase DB Write Success (patients): Created ID ${patient.id}`);
        session.patientId = patient.id; // Save patient ID to session
        responseMessage = "Patient details saved! ✅\n\nLastly, please send the Date and Time for the appointment, separated by a comma.\n(For example: 2026-03-22, 10:00 AM)";
        session.step = 'date_time';
      }
    }
  }
  else if (session.step === 'date_time') {
    // Parse Date and Time
    const parts = msgText.split(',');
    if (parts.length < 2) {
      responseMessage = "Invalid format. Please ensure you send the Date and Time separated by a comma (e.g. 2026-03-22, 10:00 AM).";
    } else {
      const aptDate = parts[0].trim();
      const aptTime = parts[1].trim();

      // DB: Create appointment record
      const { error } = await supabase.from('appointments').insert([{ 
        patient_id: session.patientId, 
        doctor_id: session.doctorId, 
        appointment_date: aptDate, 
        time_slot: aptTime, 
        status: 'Confirmed' 
      }]);

      if (error) {
        console.error("❌ Supabase DB Write Error (appointments):", error.message || error);
        responseMessage = "Sorry, we failed to book the appointment right now. Please tell us 'Hi' to try again.";
      } else {
        console.log(`✅ Supabase DB Write Success (appointments): Confirmed for patient ${session.patientId}`);
        responseMessage = `🎉 Congratulations! Your appointment is successfully confirmed.\n\n📅 Date: ${aptDate}\n⏰ Time: ${aptTime}\n\nPlease be on time. Thank you for choosing ABC Hospital!`;
        // Clear memory session so they can book again later
        delete sessions[userMobile]; 
      }
    }
  } else {
    responseMessage = "I'm not sure what you mean. Please type 'Hi' to start over.";
    delete sessions[userMobile];
  }

  const responsePayload = {
    type: "text",
    text: responseMessage
  };

  console.log('Prepared response payload:', JSON.stringify(responsePayload, null, 2));

  // --- ACTUALLY SEND THE MESSAGE TO GUPSHUP ---
  const API_KEY = process.env.GUPSHUP_API_KEY; 
  const APP_NAME = process.env.GUPSHUP_APP_NAME || "WhatsAppHospital"; 
  const SOURCE_NUMBER = "917834811114"; 

  if (API_KEY) {
    const params = new URLSearchParams();
    params.append('channel', 'whatsapp');
    params.append('source', SOURCE_NUMBER);
    params.append('destination', dto.userMobile);
    params.append('src.name', APP_NAME);
    params.append('message', JSON.stringify(responsePayload));

    try {
      await fetch('https://api.gupshup.io/wa/api/v1/msg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': API_KEY
        },
        body: params.toString()
      });
      console.log(`Successfully invoked Gupshup HTTP sending API.`);
    } catch (e) {
      console.error('Failed to send Gupshup API request:', e);
    }
  }

  return res.status(200).send('Event processed successfully');
}
