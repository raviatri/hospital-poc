import { getDoctors } from '../src/controllers/doctorController.js';

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method === 'GET') {
    return await getDoctors(req, res);
  }
  
  // Method not allowed
  res.setHeader('Allow', ['GET']);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} Not Allowed`
  });
}
