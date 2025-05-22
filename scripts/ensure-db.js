#!/usr/bin/env node

/**
 * This script ensures that the db.json file exists with the correct permissions.
 * Run this before starting the server to prevent permission issues.
 */

const fs = require('fs');
const path = require('path');

// Path to the database file
const dbPath = path.join(process.cwd(), 'db.json');

// Create the database file if it doesn't exist
if (!fs.existsSync(dbPath)) {
  console.log('[DB Setup] Creating new db.json file');
  fs.writeFileSync(dbPath, JSON.stringify({ lobbies: {} }, null, 2), { mode: 0o666 });
} else {
  // Check if the file is valid JSON
  try {
    const content = fs.readFileSync(dbPath, 'utf8');
    if (!content || content.trim() === '') {
      console.log('[DB Setup] Empty db.json file, initializing with default data');
      fs.writeFileSync(dbPath, JSON.stringify({ lobbies: {} }, null, 2), { mode: 0o666 });
    } else {
      try {
        JSON.parse(content);
        console.log('[DB Setup] Verified db.json is valid');
        
        // Ensure the file has the correct permissions
        fs.chmodSync(dbPath, 0o666);
        console.log('[DB Setup] Set permissions on db.json');
      } catch (e) {
        console.error('[DB Setup] db.json contains invalid JSON, reinitializing');
        fs.writeFileSync(dbPath, JSON.stringify({ lobbies: {} }, null, 2), { mode: 0o666 });
      }
    }
  } catch (e) {
    console.error('[DB Setup] Error reading db.json:', e);
    fs.writeFileSync(dbPath, JSON.stringify({ lobbies: {} }, null, 2), { mode: 0o666 });
  }
}

// If a .db.json.tmp file exists, remove it
const tmpPath = `${dbPath}.tmp`;
if (fs.existsSync(tmpPath)) {
  console.log('[DB Setup] Removing stale temporary file');
  fs.unlinkSync(tmpPath);
}

console.log('[DB Setup] Database file is ready'); 