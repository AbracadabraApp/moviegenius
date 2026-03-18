# Episode Content Lock System

This system prevents accidental regeneration of carefully crafted episode
content.

## 🔒 How It Works

Episodes can be marked as "locked" to prevent accidental regeneration:

```json
{
  "locked": true,
  "lockedAt": "2025-01-19T23:05:00.000Z",
  "lockedBy": "user"
}
```

## 🛡️ API Protection

The `/api/series-episode` endpoint checks for locks:

- **Locked episodes**: Returns 409 error with lock info
- **Force override**: Use `"forceRegenerate": true` to bypass
- **Regular calls**: Unaffected (no topic/context = no lock check)

## 📝 Commands

### Individual Episodes

```bash
# Lock specific episodes
npm run lock-episodes 1-1-1,1-1-2,1-1-3

# Unlock specific episodes
npm run unlock-episodes 1-1-3

# Check episode status
npm run episode-status 1-1-1
```

### Bulk Operations

```bash
# Lock entire series
npm run lock-series 1-1

# Unlock entire series
npm run unlock-series 1-1

# List all locked episodes
npm run list-locked
```

### Manual Script

```bash
# Direct script usage
node scripts/manage-episode-locks.js lock 1-1-1,1-1-2
node scripts/manage-episode-locks.js unlock 1-1-3
node scripts/manage-episode-locks.js status 1-1-1
```

## 🚨 Emergency Override

If you need to regenerate a locked episode:

```bash
curl -X POST http://localhost:3000/api/series-episode \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "New topic",
    "context": "New context",
    "seriesId": "1",
    "episodeId": "1",
    "forceRegenerate": true
  }'
```

## 📊 Current Status

All episodes 1/1/1 through 1/1/6 are currently **locked** to protect the refined
noir content.

Use `npm run list-locked` to see current lock status.

## 🔄 Workflow

1. **Development**: Content unlocked for iteration
2. **Review**: Lock content when ready for review
3. **Production**: Keep locked unless intentional changes needed
4. **Updates**: Unlock → Edit → Review → Lock again

## ⚠️ Important Notes

- Locks only affect **new generation** (topic/context calls)
- Regular API calls (pre-generated content) work normally
- Always unlock intentionally when making planned changes
- Use descriptive `lockedBy` values for audit trail
