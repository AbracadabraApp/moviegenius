# V3 Autonomous Execution Guide

**Purpose:** Set V3 implementation in motion, walk away, come back to results. Zero babysitting.

---

## Quick Start

```bash
# DRY RUN: See what would happen (no changes)
node scripts/v3-autonomous-execution.js --phase all --dry-run

# LIVE RUN: Execute all phases overnight
node scripts/v3-autonomous-execution.js --phase all

# Wake up to:
# - Database migrated
# - 21,275 V3 analyses generated
# - Validation complete
# - Full log in ./logs/v3-execution-*.log
```

---

## What It Does (No Confirmation Required)

### Phase 1: Database (5 minutes)
1. ✅ Checks if `analysis_data_v3` column exists
2. ✅ Adds column if missing
3. ✅ Tests on 10 sample movies
4. ✅ Logs success/failure

### Phase 2: Generation (6-8 hours for 21K movies)
1. ✅ Fetches all movies needing V3 analysis
2. ✅ Calculates cost estimate ($158 for 35K)
3. ✅ Processes in batches of 100
4. ✅ Retries failures automatically
5. ✅ Saves progress every batch
6. ✅ Logs every movie generated

### Phase 3: Validation (10 minutes)
1. ✅ Samples 50 random movies
2. ✅ Validates word count (180-220)
3. ✅ Validates **Movie (Year)** references (2+)
4. ✅ Validates featuredFilms (2-4 movies)
5. ✅ Reports pass rate

---

## Command Options

### Run Everything
```bash
node scripts/v3-autonomous-execution.js --phase all
```

### Run Specific Phase
```bash
# Database only
node scripts/v3-autonomous-execution.js --phase database

# Generation only (assumes DB already setup)
node scripts/v3-autonomous-execution.js --phase generation

# Validation only
node scripts/v3-autonomous-execution.js --phase validation
```

### Dry Run (Safe Preview)
```bash
# See what would happen without making changes
node scripts/v3-autonomous-execution.js --phase all --dry-run
```

---

## Configuration

Edit these values in `scripts/v3-autonomous-execution.js`:

```javascript
const V3_CONFIG = {
  database: {
    testMovies: [550, 278, 238, 424, 680, 13, 19404, 155, 98, 11],
  },

  generation: {
    batchSize: 100,        // Movies per batch
    concurrency: 5,        // Parallel generations
    totalMovies: 'all',    // or specific number like 1000
    costPerMovie: 0.0045,  // Claude cost
  },

  validation: {
    sampleSize: 50,        // Random sample for validation
    maxRetries: 3,         // Auto-retry failures
  }
};
```

---

## Progress Tracking

### Real-Time Console Output

```bash
==========================================================
PHASE 2: V3 ANALYSIS GENERATION
==========================================================
📊 Generation Plan:
   Movies: 21,275
   Estimated cost: $95.74
   Estimated time: 426 minutes (~7 hours)
   Batch size: 100
   Concurrency: 5

📦 Processing 213 batches...

📦 Batch 1/213 (100 movies)
  ✓ 550 - Fight Club (847ms)
  ✓ 278 - The Shawshank Redemption (923ms)
  ✓ 238 - The Godfather (891ms)
  ...
  Progress: 0.5% (100/21275)

📦 Batch 2/213 (100 movies)
  ✓ 424 - Schindler's List (905ms)
  ...
```

### Log File

```bash
# Detailed log saved to:
./logs/v3-execution-2025-03-22T18-30-00.000Z.log

# View progress while running:
tail -f ./logs/v3-execution-*.log

# Check for errors:
grep ERROR ./logs/v3-execution-*.log
```

### Progress Checkpoint

```bash
# Progress saved after every batch:
cat ./logs/v3-progress.json

{
  "phase": "generation",
  "completed": 1000,
  "total": 21275,
  "successful": [550, 278, 238, ...],
  "errors": [
    {"tmdb_id": 12345, "error": "Word count too short"}
  ],
  "timestamp": "2025-03-22T19:45:00.000Z",
  "elapsed": 3600000
}
```

---

## Error Handling

### Automatic Recovery

**Network errors:** Retries up to 3 times per movie
**Rate limits:** Sleeps 2 seconds between batches
**Invalid JSON:** Logs error, continues to next movie
**Database errors:** Logs error, continues to next movie

### Resume After Crash

If script crashes halfway through:

```bash
# Check progress file
cat ./logs/v3-progress.json
# Shows: 1000/21275 completed

# Restart - it will skip completed movies
node scripts/v3-autonomous-execution.js --phase generation

# Output:
# ✅ Skipping 1000 already-completed movies
# 📦 Processing remaining 20,275 movies...
```

### Error Summary

At end of execution:

```bash
==========================================================
EXECUTION SUMMARY
==========================================================
⏱️  Total time: 25847.3s (~7 hours)
✅ Successful: 21,180
❌ Errors: 95
📊 Success rate: 99.6%

❌ Error Summary:
   12345: Word count 165 outside range (180-220)
   23456: Missing required field: featuredFilms
   34567: Failed to parse JSON: Unexpected token
   ... and 92 more

📋 Full log: ./logs/v3-execution-2025-03-22T18-30-00.000Z.log
==========================================================
```

---

## Example Workflow

### Overnight Execution

```bash
# 5:00 PM - Friday
cd moviegenius

# Start autonomous execution
node scripts/v3-autonomous-execution.js --phase all > overnight.log 2>&1 &

# Note the process ID
echo $! > v3-execution.pid

# Go home

# 9:00 AM - Saturday
# Check if still running
ps aux | grep v3-autonomous

# If done, check results
cat ./logs/v3-execution-*.log | grep SUMMARY -A 20

# EXECUTION SUMMARY
# ✅ Successful: 21,180
# ❌ Errors: 95
# Success rate: 99.6%
```

### Test Run First

```bash
# Before overnight run, test with 100 movies
node scripts/v3-autonomous-execution.js --phase all --dry-run

# Output shows what would happen:
# ⚠️  DRY RUN: Would execute:
#    ALTER TABLE movie_analyses ADD COLUMN analysis_data_v3 JSONB
# ⚠️  DRY RUN: Would generate analyses for 21,275 movies
# ⚠️  DRY RUN: Would validate 50 random samples

# Looks good? Run for real on small batch:
# Edit V3_CONFIG.generation.totalMovies = 100
node scripts/v3-autonomous-execution.js --phase all

# Check results after ~5 minutes
# If successful, run full batch:
# Edit V3_CONFIG.generation.totalMovies = 'all'
node scripts/v3-autonomous-execution.js --phase all
```

---

## Cost Breakdown

### Generation Costs

```javascript
// Per movie:
// Input: ~200 tokens (title, year, prompt)
// Output: ~250 tokens (JSON analysis)
// Cost: $0.0045 per movie

// For all movies:
const totalMovies = 21275;
const costPerMovie = 0.0045;
const totalCost = totalMovies * costPerMovie;
// $95.74 for existing 21K analyses

// For all 35K movies:
const allMovies = 35000;
const fullCost = allMovies * 0.0045;
// $157.50 for complete catalog
```

### Time Estimates

```javascript
// Per movie:
// Claude API: ~800ms average
// Database write: ~50ms
// Total: ~850ms per movie

// With batching (5 concurrent):
// Effective rate: ~170ms per movie

// For 21,275 movies:
const timePerMovie = 0.17; // seconds
const totalTime = 21275 * timePerMovie;
// 3616 seconds = ~60 minutes = 1 hour

// With overhead (logging, batching):
// Realistic: ~2-3 hours for 21K movies
```

---

## Validation Criteria

### Automatic Checks

Every generated analysis must pass:

1. **Word Count:** 180-220 words
   ```javascript
   const wordCount = analysis.split(/\s+/).length;
   if (wordCount < 180 || wordCount > 220) throw Error();
   ```

2. **Movie References:** 2+ inline **Movie (Year)** refs
   ```javascript
   const refs = analysis.match(/\*\*[^*]+\(\d{4}\)\*\*/g);
   if (!refs || refs.length < 2) throw Error();
   ```

3. **Featured Films:** 2-4 related movies
   ```javascript
   if (featuredFilms.length < 2 || featuredFilms.length > 4) throw Error();
   ```

4. **Required Fields:** analysis, featuredFilms, mood
   ```javascript
   if (!data.analysis || !data.featuredFilms || !data.mood) throw Error();
   ```

---

## Monitoring While Running

### Check Progress

```bash
# See current batch
tail -10 ./logs/v3-execution-*.log

# Count successes
grep "✓" ./logs/v3-execution-*.log | wc -l

# Count errors
grep "✗" ./logs/v3-execution-*.log | wc -l

# Current progress percentage
cat ./logs/v3-progress.json | jq '.completed / .total * 100'
```

### Stop If Needed

```bash
# Find process
ps aux | grep v3-autonomous

# Stop gracefully (will save progress)
kill <PID>

# Force stop (not recommended)
kill -9 <PID>
```

---

## After Completion

### Verify Results

```bash
# 1. Check summary
cat ./logs/v3-execution-*.log | grep -A 20 "EXECUTION SUMMARY"

# 2. Count generated analyses in database
psql $DATABASE_URL -c "
  SELECT COUNT(*)
  FROM movie_analyses
  WHERE analysis_data_v3 IS NOT NULL
"

# 3. Sample a few movies
psql $DATABASE_URL -c "
  SELECT tmdb_id, analysis_data_v3->'analysis'
  FROM movie_analyses
  WHERE analysis_data_v3 IS NOT NULL
  LIMIT 5
"
```

### Handle Errors

If errors occurred:

```bash
# Get list of failed movies
cat ./logs/v3-execution-*.log | grep "✗" | awk '{print $2}'

# Re-run just the failures
# Edit testMovies array with failed IDs
node scripts/v3-autonomous-execution.js --phase generation
```

---

## Safety Features

### Built-In Protections

1. **Dry Run Mode** - Preview without changes
2. **Progress Checkpoints** - Resume after crash
3. **Error Isolation** - One failure doesn't stop batch
4. **Automatic Retries** - Network errors retry 3x
5. **Validation** - Every analysis checked before save
6. **Logging** - Full audit trail

### Rollback Database Changes

If something goes wrong:

```sql
-- Remove column (reversible)
ALTER TABLE movie_analyses DROP COLUMN analysis_data_v3;

-- Or just clear data
UPDATE movie_analyses SET analysis_data_v3 = NULL;
```

---

## FAQ

**Q: Can I stop and resume?**
A: Yes. Progress is saved after every batch. Re-run the same command.

**Q: What if my computer sleeps?**
A: Run in tmux/screen or on a server:
```bash
tmux new -s v3
node scripts/v3-autonomous-execution.js --phase all
# Ctrl+B, D to detach
```

**Q: How do I know it's working?**
A: Watch the log file:
```bash
tail -f ./logs/v3-execution-*.log
```

**Q: Can I run this in production?**
A: Yes, but test with `--dry-run` first, then small batch, then full run.

**Q: What if I run out of API credits?**
A: Script will error and stop. Resume later when credits refilled.

---

## Summary

**Zero-interaction V3 implementation:**

```bash
# One command
node scripts/v3-autonomous-execution.js --phase all

# Walk away
# Come back to:
# ✅ Database migrated
# ✅ 21,275 analyses generated
# ✅ Validation complete
# ✅ Full log saved

# Total time: ~7 hours
# Total cost: ~$96
# Total confirmations required: 0
```

That's it. Set it and forget it.
