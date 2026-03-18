# Robust Migration System

## Overview
This system provides unattended, fault-tolerant migration of ~19K movies from Supabase to Railway PostgreSQL with automatic restart capabilities.

## Files Created

### Core Migration Scripts
- `migrate-full-dataset-to-railway-robust.js` - Main migration script with restart/recovery
- `migration-monitor.js` - Automatic restart and health monitoring  
- `check-migration-status.js` - Quick status checker

### Generated Files (during migration)
- `migration-progress.json` - Persistent progress tracking
- `migration.log` - Detailed migration log
- `monitor.log` - Monitor activity log

## Quick Start (Unattended Mode)

### Option 1: Fire and Forget
```bash
# Start the monitored migration (will restart automatically on failures)
node migration-monitor.js
```

### Option 2: Manual Control
```bash
# Start migration manually
DATABASE_URL="your_railway_url" node migrate-full-dataset-to-railway-robust.js

# Check status anytime
node check-migration-status.js

# Resume from specific batch if needed
node migrate-full-dataset-to-railway-robust.js --resume=25
```

## Features

### 🔄 Automatic Restart
- Detects crashes and automatically restarts
- Resumes from last completed batch
- Max 10 restart attempts with exponential backoff

### 📊 Progress Tracking  
- Persistent progress saves every 5 batches
- Detailed statistics on success/failure rates
- Tracks recent failures for debugging

### 🛡️ Error Handling
- Database connection retry with exponential backoff
- Individual movie/analysis error isolation  
- Health checks before starting
- Graceful shutdown on SIGINT/SIGTERM

### 📈 Monitoring
- Real-time progress logging
- Batch completion notifications
- Performance metrics (movies/hour)
- ETA calculations

## Status Monitoring

### Check Status Anytime
```bash
node check-migration-status.js
```

Sample output:
```
🔍 Migration Status Report
📊 Progress File Status:
   Status: 🔄 IN PROGRESS
   Last Batch: 25/40  
   Runtime: 2h 15m
   Movies: 12,500✅ 23❌ 0⏭️
   Success Rate: 99.8%
   Estimated completion: 1.2 hours

🗄️  Database Status:  
   Railway Movies: 12,523/19,872 (63.0%)
   Railway Analyses: 10,234/13,647 (75.0%)
```

## Recovery Scenarios

### After System Restart/Crash
The system automatically detects incomplete migrations and resumes:
```bash
# This will automatically resume from last completed batch
node migration-monitor.js
```

### Manual Resume from Specific Batch
```bash
node migrate-full-dataset-to-railway-robust.js --resume=30
```

### Start Fresh (Clean Slate)
```bash
# Remove progress file to start over
rm migration-progress.json migration.log
node migration-monitor.js
```

## Configuration

Edit `CONFIG` in `migrate-full-dataset-to-railway-robust.js`:
```javascript
const CONFIG = {
  batchSize: 500,              // Movies per batch
  pauseBetweenBatches: 3000,   // 3 second pause
  maxRetries: 5,               // Retry failed operations
  retryDelay: 10000,           // 10 second base delay
  saveProgressEvery: 5,        // Save progress every N batches
};
```

## Expected Timeline

- **Total Movies**: 19,872
- **Batch Size**: 500 movies/batch  
- **Total Batches**: ~40 batches
- **Rate**: ~4-6 movies/second
- **Estimated Duration**: 2-3 hours unattended

## Troubleshooting

### Migration Stuck?
```bash
# Check if process is running
ps aux | grep migrate

# Kill and restart if needed  
pkill -f migrate
node migration-monitor.js
```

### Database Issues?
```bash
# Test Railway connection
DATABASE_URL="your_url" node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => console.log('✅ Connected')).catch(console.error);
"
```

### Check Logs
```bash
# View recent migration activity
tail -f migration.log

# View monitor activity  
tail -f monitor.log
```

## What Happens During Migration

1. **Health Check**: Verifies Railway database connectivity
2. **Progress Recovery**: Loads previous progress or starts fresh
3. **Batch Processing**: Processes movies in 500-movie batches
4. **Data Migration**: For each movie:
   - Insert/update movie record in Railway
   - Migrate all associated analyses
   - Handle conflicts gracefully
5. **Progress Tracking**: Saves progress every 5 batches
6. **Auto-Recovery**: Restarts on failures, resumes from last batch
7. **Completion**: Marks migration complete and provides final summary

The system is designed to be completely hands-off once started. You can start it before bed and wake up to a completed migration!