export default function handler(req, res) {
  // Allow GET requests for Gupshup to verify the webhook URL is active
  if (req.method === 'GET') {
    return res.status(200).send('Webhook is active');
  }

  // Only allow POST requests for actual messages
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body || {};
  
  // Log the incoming request
  console.log('Incoming webhook request:', JSON.stringify(body, null, 2));

  // If this is a Gupshup event but NOT an incoming message (e.g. read/delivered receipt or billing-event)
  if (body.type && body.type !== 'message') {
    console.log(`Received non-message event of type: ${body.type}`);
    return res.status(200).send('Event received');
  }
  
  // Extract user mobile number and message text.
  // This safely handles both a simplified test body and a typical nested Gupshup payload.
  const userMobile = body.mobile || body?.payload?.source || 'unknown';
  let messageText = body.text || body?.payload?.payload?.text;

  if (typeof messageText !== 'string' || !messageText) {
    // Gupshup often sends an empty or dummy POST payload to verify the webhook works.
    // Instead of throwing a 400 error, we return 200 OK so they accept the URL.
    return res.status(200).send('Webhook is ready to receive events');
  }

  const normalizedText = messageText.trim().toLowerCase();

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
