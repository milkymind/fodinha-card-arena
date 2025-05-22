#!/usr/bin/env node

/**
 * This script purges old lobbies from the database.
 * It can be run manually or automatically when starting the server.
 * 
 * Usage:
 *   node scripts/purge-lobbies.js [options]
 * 
 * Options:
 *   --max-age=<days>  Maximum age of lobbies in days (default: 7)
 *   --dry-run         Show what would be deleted without actually deleting
 *   --silent          Don't output any logs
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const maxAgeDays = parseInt(args.find(arg => arg.startsWith('--max-age='))?.split('=')[1] || '7', 10);
const dryRun = args.includes('--dry-run');
const silent = args.includes('--silent');

/**
 * Log a message unless in silent mode
 */
function log(message) {
  if (!silent) {
    console.log(`[Lobby Purge] ${message}`);
  }
}

/**
 * Purge old lobbies directly from the db.json file
 */
async function purgeLobbies() {
  try {
    // Get the path to the db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    
    // Check if the file exists
    if (!fs.existsSync(dbPath)) {
      log('Database file not found. No lobbies to purge.');
      return {
        totalLobbies: 0,
        lobbiesPurged: 0,
        lobbiesToPurge: []
      };
    }
    
    // Read the database file
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    
    // Parse the JSON (handle empty file case)
    let data;
    try {
      data = dbContent.trim() ? JSON.parse(dbContent) : { lobbies: {} };
    } catch (err) {
      log('Database file contains invalid JSON. Reinitializing with empty data.');
      data = { lobbies: {} };
    }
    
    // Make sure we have a lobbies object
    if (!data.lobbies) {
      data.lobbies = {};
    }
    
    // Calculate the cutoff date
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (maxAgeDays * 24 * 60 * 60 * 1000));
    
    // Identify old lobbies to purge
    const lobbiesToPurge = [];
    
    for (const [gameId, lobby] of Object.entries(data.lobbies)) {
      // Use the lastUpdated field if it exists, otherwise assume the lobby is old
      const lastUpdated = lobby.lastUpdated ? new Date(lobby.lastUpdated) : null;
      
      if (!lastUpdated || lastUpdated < cutoffDate) {
        lobbiesToPurge.push(gameId);
      }
    }
    
    // Delete old lobbies (unless this is a dry run)
    let lobbiesPurged = 0;
    
    if (!dryRun && lobbiesToPurge.length > 0) {
      for (const gameId of lobbiesToPurge) {
        delete data.lobbies[gameId];
        lobbiesPurged++;
      }
      
      // Write the updated data back to the file (safely)
      const tmpPath = `${dbPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
      
      // On Windows, we need to unlink the destination file first
      if (process.platform === 'win32' && fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      
      // Rename the temporary file to the actual file
      fs.renameSync(tmpPath, dbPath);
    }
    
    return {
      totalLobbies: Object.keys(data.lobbies).length + (dryRun ? 0 : lobbiesPurged),
      lobbiesPurged,
      lobbiesToPurge
    };
  } catch (err) {
    throw new Error(`Failed to purge lobbies: ${err.message}`);
  }
}

// Run the purge
purgeLobbies()
  .then((result) => {
    log(`Total lobbies: ${result.totalLobbies}`);
    if (dryRun) {
      log(`Would purge ${result.lobbiesToPurge.length} lobbies (dry run)`);
      if (result.lobbiesToPurge.length > 0) {
        log(`Lobbies that would be purged: ${result.lobbiesToPurge.join(', ')}`);
      }
    } else {
      log(`Purged ${result.lobbiesPurged} lobbies`);
    }
  })
  .catch((err) => {
    console.error(`[Lobby Purge] Error: ${err.message}`);
    process.exit(1);
  }); 