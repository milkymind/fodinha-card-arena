# Lobby Purging Functionality

This document explains how the automatic lobby purging works in the Fodinha game system.

## Overview

Over time, the database can accumulate old, inactive lobbies that are no longer in use. The lobby purging functionality automatically removes these old lobbies when the server starts, keeping your database clean and efficient.

## How It Works

1. **Automatic Purging**: When the server starts (via `npm run start`), it automatically runs the purge script to remove old lobbies.

2. **Age-Based Removal**: By default, lobbies that haven't been updated in the last 7 days are considered "old" and are removed.

3. **Activity Tracking**: Every time a lobby is modified (players join/leave, game state changes), its `lastUpdated` timestamp is refreshed.

## Usage Options

### Automatic Purging (Default)

When you start the server normally, purging happens automatically:

```bash
npm run start
```

### Start Without Purging

If you want to start the server without purging lobbies:

```bash
npm run start:no-purge
```

### Manual Purging

You can manually purge lobbies anytime:

```bash
# Purge lobbies older than 7 days (default)
npm run purge-lobbies

# Dry run (shows what would be purged without actually deleting)
npm run purge-lobbies:dry
```

### Custom Purge Options

For more control, you can run the script directly with custom options:

```bash
# Purge lobbies older than 3 days
node scripts/purge-lobbies.js --max-age=3

# Dry run with custom age
node scripts/purge-lobbies.js --max-age=14 --dry-run

# Don't show any output
node scripts/purge-lobbies.js --silent
```

## API Endpoint

The system includes a REST API endpoint for purging lobbies programmatically:

```
DELETE /api/purge-lobbies?maxAgeDays=7&dryRun=false
```

Parameters:
- `maxAgeDays` (optional): Maximum age in days (default: 7)
- `dryRun` (optional): If 'true', shows what would be purged without actually deleting (default: false)

Response example:
```json
{
  "totalLobbies": 80,
  "lobbiesPurged": 75,
  "lobbiesToPurge": ["ABC123", "DEF456", "..."],
  "isDryRun": false,
  "maxAgeInDays": 7
}
```

## Best Practices

- In production, it's recommended to set up periodic purging using a cron job or similar mechanism
- For heavily used applications, consider lowering the default age threshold from 7 days to something shorter 