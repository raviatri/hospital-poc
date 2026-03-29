import { getPatients } from '../src/controllers/patientController.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await getPatients(req, res);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} Not Allowed`
  });
}
