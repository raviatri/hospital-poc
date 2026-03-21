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
          // Valid event but not an incoming message (e.g. delivery receipt, status update)
          this.isMessageEvent = false;
          return;
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

export default function handler(req, res) {
  // Allow GET requests for webhook URL verification
  if (req.method === 'GET') {
    return res.status(200).send('Webhook is active');
  }

  // Only allow POST requests for actual messages/events
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Log the incoming request
  console.log('Incoming webhook request:', JSON.stringify(req.body, null, 2));

  // Parse using our new DTO extraction logic
  const dto = new WebhookRequestDTO(req.body);

  // If this is a valid event from WhatsApp but NOT an incoming text message, acknowledge and skip
  if (!dto.isMessageEvent) {
    console.log('Received non-message event. Acknowledging safely.');
    return res.status(200).send('Event received');
  }
  
  if (typeof dto.messageText !== 'string' || !dto.messageText) {
    // Acknowledge empty dummy pings or unsupported message types (like images/audio) for POC
    console.log('Dummy ping or unsupported message type received.');
    return res.status(200).send('Webhook is ready to receive events');
  }

  const normalizedText = dto.messageText.trim().toLowerCase();

  // Simple if-else text flow
  let responseMessage;

  if (normalizedText === 'hi' || normalizedText === 'hello') {
    responseMessage = "Welcome to ABC Hospital\n1. Book Appointment";
  } else if (normalizedText === '1') {
    responseMessage = "Select Doctor:\n1. Dr Sharma\n2. Dr Gupta";
  } else if (normalizedText === '2') {
    responseMessage = "Enter date (YYYY-MM-DD)";
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedText)) {
    // Regex to check for date formatted as YYYY-MM-DD
    responseMessage = "Select time:\n10:00 AM\n11:00 AM";
  } else if (/^(10|11):00\s?(am|pm)?$/.test(normalizedText)) {
    // Regex to check for time 10:00 AM or 11:00 AM
    responseMessage = "Appointment Confirmed!";
  } else {
    // Default flow
    responseMessage = "Type 'Hi' to start";
  }

  const responsePayload = {
    type: "text",
    text: responseMessage
  };

  // Log the outgoing response
  console.log('Outgoing webhook response:', JSON.stringify(responsePayload, null, 2));

  // Return the response as JSON format expected by Gupshup/User
  return res.status(200).json(responsePayload);
}
