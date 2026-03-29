import { getSlots } from '../src/controllers/slotController.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return await getSlots(req, res);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} Not Allowed`
  });
}
