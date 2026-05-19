import { supabase } from '../src/config/supabase.js';

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
          } else if (this.messageType === 'interactive' && msg.interactive) {
            if (msg.interactive.type === 'button_reply') {
              this.messageText = msg.interactive.button_reply.id || msg.interactive.button_reply.title;
            } else if (msg.interactive.type === 'list_reply') {
              this.messageText = msg.interactive.list_reply.id || msg.interactive.list_reply.title;
            }
          }
          return;
        } else {
          this.isMessageEvent = false; return;
        }
      }
    }
    
    // 2. Legacy Gupshup payload format
    if (body.type === 'message' || body.type === 'quick_reply' || body.type === 'list_reply') {
      this.isMessageEvent = true;
      this.userMobile = body.mobile || body.payload?.source || 'unknown';
      this.messageType = body.payload?.type || body.type || 'text';
      
      if (['button_reply', 'list_reply', 'quick_reply'].includes(this.messageType) || ['button_reply', 'list_reply', 'quick_reply'].includes(body.type)) {
         this.messageText = body.payload?.id || body.payload?.postbackText || body.payload?.title || body.text;
      } else {
         this.messageText = body.text || body.payload?.payload?.text;
      }
    } else if (body.type && !['message', 'button_reply', 'list_reply', 'quick_reply'].includes(body.type)) {
      this.isMessageEvent = false;
    } else if (body.text) {
      // 3. Simple custom test JSON format
      this.isMessageEvent = true;
      this.userMobile = body.mobile || 'unknown';
      this.messageType = 'text';
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

  // Reset conversation if user says Hi/Hello/Hey/Start
  const isGreeting = ['hi', 'hello', 'hey', 'start'].includes(msgLower);
  
  if (!sessions[userMobile] || isGreeting) {
    sessions[userMobile] = { step: 'welcome' };
  }

  const session = sessions[userMobile];
  let responsePayload = { type: "text", text: "Type 'Hi' to start" };

  try {
    // --- State Machine ---
    
    if (session.step === 'welcome' || msgText === 'menu_main') {
      responsePayload = {
        type: "quick_reply",
        msgid: "welcome_msg",
        content: {
          type: "text",
          text: "Welcome to *ABC Hospital* 🏥\n\nHow can we help you today?",
          header: "ABC Hospital",
          caption: "Select an option below"
        },
        options: [
          { type: "text", title: "Book Appointment", postbackText: "action_book" },
          { type: "text", title: "View Appointments", postbackText: "action_view" },
          { type: "text", title: "Contact Hospital", postbackText: "action_contact" }
        ]
      };
      session.step = 'main_menu_selection';
    }
    
    else if (session.step === 'main_menu_selection') {
      if (msgText === 'action_book' || msgText === 'Book Appointment') {
        // Fetch doctors dynamically
        const { data: doctors, error } = await supabase.from('doctors')
          .select('id, name, specializations(name)')
          .eq('is_active', true)
          .limit(10);
          
        if (error || !doctors || doctors.length === 0) {
          responsePayload = { type: "text", text: "Sorry, no doctors are currently available. Please try again later." };
          session.step = 'welcome';
        } else {
          const listItems = doctors.map(d => ({
            title: d.name.substring(0, 24), // Gupshup title limit is 24 chars
            description: d.specializations ? d.specializations.name.substring(0, 72) : "General",
            postbackText: `doc_${d.id}`
          }));

          responsePayload = {
            type: "list",
            title: "Available Doctors",
            body: "Please select a doctor to continue with your booking.",
            msgid: "doctor_list",
            globalButtons: [{ type: "text", title: "Select Doctor" }],
            items: [
              {
                title: "Our Specialists",
                options: listItems
              }
            ]
          };
          session.step = 'doctor_selection';
        }
      } else if (msgText === 'action_contact' || msgText === 'Contact Hospital') {
        responsePayload = { type: "text", text: "📞 *Contact us at:*\n+1 800 123 4567\n\n📧 *Email:*\ninfo@abchospital.com\n\n📍 *Address:*\n123 Health Ave, Wellness City" };
        session.step = 'welcome';
      } else {
        responsePayload = { type: "text", text: "Coming soon! Type 'Hi' to return to the menu." };
        session.step = 'welcome';
      }
    }
    
    else if (session.step === 'doctor_selection') {
      if (msgText.startsWith('doc_')) {
        session.doctorId = msgText.replace('doc_', '');
        
        // Let's get the doctor name to confirm
        const { data: doctor } = await supabase.from('doctors').select('name').eq('id', session.doctorId).single();
        const docName = doctor ? doctor.name : "the selected doctor";
        
        responsePayload = { type: "text", text: `Great, you selected *${docName}*.\n\nPlease reply with the *Patient's Full Name*.` };
        session.step = 'patient_name';
      } else {
        responsePayload = { type: "text", text: "Please use the list menu to select a doctor." };
      }
    }
    
    else if (session.step === 'patient_name') {
      if (msgText.length < 2) {
        responsePayload = { type: "text", text: "Name seems too short. Please provide the full name." };
      } else {
        session.patientName = msgText;
        responsePayload = { type: "text", text: `Thanks! Now, please reply with the *Mobile Number* for ${msgText} (10 digits).` };
        session.step = 'patient_mobile';
      }
    }
    
    else if (session.step === 'patient_mobile') {
      const mobileRegex = /^[0-9]{10,15}$/;
      const cleanedMobile = msgText.replace(/\D/g, '');
      
      if (!mobileRegex.test(cleanedMobile)) {
        responsePayload = { type: "text", text: "Invalid format. Please send a valid mobile number with at least 10 digits." };
      } else {
        session.patientMobile = cleanedMobile;
        
        // DB: Create or find patient
        const { data: patient, error } = await supabase.from('patients')
          .insert([{ name: session.patientName, mobile: session.patientMobile }])
          .select('*')
          .single();
          
        if (error) {
          console.error("Patient save error:", error);
          responsePayload = { type: "text", text: "Oops, we couldn't save patient details right now. Please type 'Hi' to start over." };
          session.step = 'welcome';
        } else {
          session.patientId = patient.id;
          
          // Generate Date List for Quick Replies (Today, Tomorrow, Day After)
          const today = new Date();
          const d1 = new Date(today);
          const d2 = new Date(today); d2.setDate(today.getDate() + 1);
          const d3 = new Date(today); d3.setDate(today.getDate() + 2);
          
          const fmt = d => d.toISOString().split('T')[0];
          
          responsePayload = {
            type: "quick_reply",
            msgid: "date_selection",
            content: { 
              type: "text", 
              text: "Patient details saved! ✅\n\nPlease choose an appointment date." 
            },
            options: [
              { type: "text", title: "Today", postbackText: `date_${fmt(d1)}` },
              { type: "text", title: "Tomorrow", postbackText: `date_${fmt(d2)}` },
              { type: "text", title: fmt(d3), postbackText: `date_${fmt(d3)}` }
            ]
          };
          session.step = 'date_selection';
        }
      }
    }
    
    else if (session.step === 'date_selection') {
      if (msgText.startsWith('date_') || ['Today', 'Tomorrow'].includes(msgText) || /^\d{4}-\d{2}-\d{2}$/.test(msgText)) {
        let aptDate = msgText;
        if (msgText.startsWith('date_')) {
          aptDate = msgText.replace('date_', '');
        } else if (msgText === 'Today') {
          aptDate = new Date().toISOString().split('T')[0];
        } else if (msgText === 'Tomorrow') {
          const d = new Date(); d.setDate(d.getDate() + 1);
          aptDate = d.toISOString().split('T')[0];
        }
        
        session.appointmentDate = aptDate;
        
        // Fetch available slots from DB
        const { data: slots, error } = await supabase
          .from('doctor_slots')
          .select('id, start_time, end_time, booking_status_master!inner(code)')
          .eq('doctor_id', session.doctorId)
          .eq('slot_date', aptDate)
          .eq('booking_status_master.code', 'AVAILABLE')
          .order('start_time', { ascending: true })
          .limit(10);
          
        if (error) console.error("Slots fetch error:", error);
        
        if (!slots || slots.length === 0) {
          responsePayload = { type: "text", text: "Sorry, no slots are available for this date. Please type 'Hi' to restart." };
        } else {
          const listItems = slots.map(s => ({
            title: s.start_time.substring(0, 5), // '10:00:00' -> '10:00'
            description: "Available",
            postbackText: `slot_${s.id}_${s.start_time.substring(0,5)}`
          }));

          responsePayload = {
            type: "list",
            title: "Available Slots",
            body: `Select a time slot for ${aptDate}`,
            msgid: "slot_list",
            globalButtons: [{ type: "text", title: "Select Time" }],
            items: [{ title: "Morning / Afternoon", options: listItems }]
          };
          session.step = 'slot_selection';
        }
      } else {
        responsePayload = { type: "text", text: "Please use the buttons to select a date." };
      }
    }
    
    else if (session.step === 'slot_selection') {
      if (msgText.startsWith('slot_')) {
        // format: slot_ID_TIME
        const parts = msgText.split('_');
        session.slotId = parts[1];
        session.slotTime = parts.slice(2).join('_'); // reconnect any potential _ in time though unlikely
        
        responsePayload = {
          type: "quick_reply",
          msgid: "confirm_booking",
          content: { 
            type: "text", 
            text: `Please review your booking details:\n\n👤 *Patient:* ${session.patientName}\n📅 *Date:* ${session.appointmentDate}\n⏰ *Time:* ${session.slotTime}\n\nDo you want to confirm this booking?` 
          },
          options: [
            { type: "text", title: "✅ Confirm Booking", postbackText: "confirm_yes" },
            { type: "text", title: "❌ Cancel", postbackText: "confirm_no" }
          ]
        };
        session.step = 'confirmation';
      } else {
        responsePayload = { type: "text", text: "Please use the list menu to select a slot." };
      }
    }
    
    else if (session.step === 'confirmation') {
      if (msgText === 'confirm_yes' || msgText === '✅ Confirm Booking') {
        
        // 1. Create Appointment
        const { error: aptError } = await supabase.from('appointments').insert([{ 
          patient_id: session.patientId, 
          doctor_id: session.doctorId, 
          appointment_date: session.appointmentDate, 
          time_slot: session.slotTime, 
          status_id: 2 // BOOKED
        }]);

        if (aptError) {
          console.error("Booking error:", aptError);
          responsePayload = { type: "text", text: "Sorry, we failed to finalize the booking. Please type 'Hi' to restart." };
        } else {
          // 2. Mark Slot as BOOKED in doctor_slots
          const { data: statusData } = await supabase.from('booking_status_master').select('id').eq('code', 'BOOKED').single();
          if (statusData) {
            await supabase.from('doctor_slots').update({ booking_status_id: statusData.id }).eq('id', session.slotId);
          }

          responsePayload = {
            type: "text",
            text: `🎉 *Congratulations!* Your appointment is successfully confirmed.\n\n👤 *Patient:* ${session.patientName}\n📅 *Date:* ${session.appointmentDate}\n⏰ *Time:* ${session.slotTime}\n\n🏥 *ABC Hospital*\nPlease arrive 10 minutes early. Have a great day!`
          };
        }
        delete sessions[userMobile]; // Clear session
      } else if (msgText === 'confirm_no' || msgText === '❌ Cancel') {
        responsePayload = { type: "text", text: "Booking cancelled. Type 'Hi' anytime to start over." };
        delete sessions[userMobile];
      } else {
         responsePayload = { type: "text", text: "Please select Confirm or Cancel from the buttons." };
      }
    }
    
    else {
      responsePayload = { type: "text", text: "I'm not sure what you mean. Please type 'Hi' to start over." };
      delete sessions[userMobile];
    }
  } catch (error) {
    console.error("State Machine Error:", error);
    responsePayload = { type: "text", text: "Something went wrong on our end. Please type 'Hi' to start over." };
    delete sessions[userMobile];
  }

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
    
    // The constructed responsePayload matches Gupshup outbound message formatting
    params.append('message', JSON.stringify(responsePayload));

    try {
      const response = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': API_KEY
        },
        body: params.toString()
      });
      const responseText = await response.text();
      console.log(`Successfully invoked Gupshup HTTP sending API. Status: ${response.status}. Response: ${responseText}`);
    } catch (e) {
      console.error('Failed to send Gupshup API request:', e);
    }
  }

  return res.status(200).send('Event processed successfully');
}
