import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Simple health check response
    res.status(200).json({
      status: 'ok',
      timestamp: Date.now(),
      service: 'fodinha-card-game-api',
      version: '1.1.0'
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
} 