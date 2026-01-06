# User Counter System

This document explains how the user counter system works and how other instances can integrate with it.

## Overview

The user counter tracks unique users based on their IP address (hashed for privacy). Each instance maintains its own count, and instances can optionally report their counts to a central service or to each other.

## How It Works

1. **User Tracking**: When a user visits the `/configure` page or requests the manifest, their IP is hashed and stored
2. **Uniqueness**: Each IP is tracked per day, so the same user counts as one unique user per day
3. **Privacy**: IPs are hashed using SHA-256, so actual IPs are never stored
4. **Storage**: Uses Redis (if available) or in-memory cache

## API Endpoints

### Track User
```http
POST /api/stats/track-user
```

Tracks the current user's IP and returns the total count.

**Response:**
```json
{
  "success": true,
  "count": 1234
}
```

### Get User Count
```http
GET /api/stats/users
```

Returns the total number of unique users.

**Response:**
```json
{
  "count": 1234
}
```

**Cache**: 5 minutes

### Report External Users
```http
POST /api/stats/report-users
Content-Type: application/json

{
  "count": 500,
  "instanceId": "my-instance-id"
}
```

Allows other instances to report their user counts for aggregation.

## Integration for Other Instances

### Option 1: Track Locally Only

Each instance tracks its own users independently. This is the default behavior.

### Option 2: Report to Main Instance

Other instances can report their counts to the main instance:

```javascript
// In your instance's code
async function reportUserCount() {
  const myCount = await getUserCount(); // Your local count
  const mainInstanceUrl = 'https://main-instance.com';
  
  await fetch(`${mainInstanceUrl}/api/stats/report-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      count: myCount,
      instanceId: 'your-unique-instance-id'
    })
  });
}

// Call periodically (e.g., every hour)
setInterval(reportUserCount, 60 * 60 * 1000);
```

### Option 3: Centralized Service

For true aggregation across all instances, you would need:

1. A central Redis instance that all instances can access
2. Or a central API service that aggregates counts from all instances
3. Each instance reports to this central service

## Implementation Details

### IP Hashing

IPs are hashed using SHA-256:
```javascript
const hash = crypto.createHash('sha256').update(ip).digest('hex');
```

### Storage Keys

- User count: `tmdb-addon:unique-users`
- Daily IP tracking: `tmdb-addon:user-ips:YYYY-MM-DD:${ipHash}`
- External reports: `tmdb-addon:unique-users:external:${instanceId}:YYYY-MM-DD`

### TTL (Time To Live)

- Daily IP tracking: 24 hours
- User count: 1 year
- External reports: 7 days

## Privacy Considerations

- IPs are hashed, not stored in plain text
- Only the hash is used for uniqueness checking
- No personal information is stored
- Counts are aggregated and anonymous

## Example: Adding Counter to Your Instance

If you've forked this repository, the counter is already included. To display it:

1. The counter automatically appears on the Home page
2. It tracks users when they visit `/configure` or request `/manifest.json`
3. The count is displayed in the UI automatically

## Troubleshooting

### Counter not updating

- Check if Redis is configured (if using Redis)
- Verify cache is not disabled (`NO_CACHE=false`)
- Check server logs for errors

### Count resets

- In-memory cache resets on server restart
- Redis persists across restarts
- For production, use Redis for persistence

## Future Enhancements

Potential improvements:
- Centralized aggregation service
- Real-time updates across instances
- Historical data and trends
- Geographic distribution (optional, with user consent)

