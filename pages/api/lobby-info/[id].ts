import type { NextApiRequest, NextApiResponse } from 'next';
import { getLobby } from '../persistent-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const lobby = await getLobby(id as string);
    if (!lobby) {
      return res.status(404).json({ status: 'error', error: 'Lobby not found' });
    }
    
    return res.status(200).json({
      status: 'success',
      lobby: {
        ...lobby,
        gameStarted: lobby.gameStarted || false,
      },
    });
  } catch (error) {
    console.error('Error getting lobby info:', error);
    return res.status(500).json({ status: 'error', error: 'Failed to get lobby info' });
  }
} 