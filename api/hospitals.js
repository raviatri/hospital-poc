import { getHospitals } from '../src/controllers/hospitalController.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await getHospitals(req, res);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} Not Allowed`
  });
}
