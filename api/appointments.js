import { getAppointments } from '../src/controllers/appointmentController.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await getAppointments(req, res);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} Not Allowed`
  });
}
