import { NextApiRequest, NextApiResponse } from 'next';
import { getAllLobbies, deleteLobby } from './persistent-store';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { maxAgeDays = 7, dryRun = false } = req.query;
    
    // Parse maxAgeDays to number with a default of 7 days
    const maxAgeInDays = Number(maxAgeDays) || 7;
    const isDryRun = dryRun === 'true';
    
    // Calculate the cutoff date (lobbies older than this will be purged)
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (maxAgeInDays * 24 * 60 * 60 * 1000));
    
    // Get all lobbies
    const lobbies = await getAllLobbies();
    
    // Identify old lobbies to purge
    const lobbiesToPurge: string[] = [];
    
    for (const [gameId, lobby] of Object.entries(lobbies)) {
      // We'll use the lastUpdated field if it exists, otherwise assume the lobby is old
      // In a production environment, you should always have a lastUpdated timestamp
      const lastUpdated = lobby.lastUpdated ? new Date(lobby.lastUpdated) : null;
      
      if (!lastUpdated || lastUpdated < cutoffDate) {
        lobbiesToPurge.push(gameId);
      }
    }
    
    // Delete old lobbies (unless this is a dry run)
    if (!isDryRun) {
      for (const gameId of lobbiesToPurge) {
        await deleteLobby(gameId);
      }
    }
    
    // Return the purge results
    return res.status(200).json({
      totalLobbies: Object.keys(lobbies).length,
      lobbiesPurged: isDryRun ? 0 : lobbiesToPurge.length,
      lobbiesToPurge: lobbiesToPurge,
      isDryRun,
      maxAgeInDays
    });
  } catch (error) {
    console.error('Error purging lobbies:', error);
    return res.status(500).json({ error: 'Failed to purge lobbies' });
  }
} 