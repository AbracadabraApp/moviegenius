# Browse Collections Database Insertion

## Overview

Insert 3,488 curated browse collections (≥4 movies threshold) into your Railway PostgreSQL database.

## Prerequisites

### 1. Railway Database URL

You need the Railway PostgreSQL connection string. Get it from:
- Railway dashboard → Your project → PostgreSQL service → Variables → `DATABASE_URL`

The URL looks like:
```
postgresql://postgres:password@monorail.proxy.rlwy.net:12345/railway
```

### 2. Database Schema Installed

The browse lists schema must be installed first:

```bash
# Check if schema exists
node scripts/check-browse-schema.js

# If not installed, run:
RAILWAY_DATABASE_URL=your_url_here node scripts/install-browse-schema.js
```

### 3. Movies Table Populated

Browse collections link to movies via UUID mapping. Your `movies` table should have movies with `tmdb_id` values.

## Running the Insertion

### Option 1: One-time with environment variable

```bash
RAILWAY_DATABASE_URL=postgresql://... node scripts/insert-browse-data.js
```

### Option 2: Add to `.env.local` (recommended for repeated use)

```bash
# Add to .env.local
echo "RAILWAY_DATABASE_URL=postgresql://..." >> .env.local

# Then run:
node scripts/insert-browse-data.js
```

### Option 3: Add to `.env.development` (team-wide)

**Warning**: Don't commit database credentials to git!

```bash
# Add to .env.development (gitignored)
RAILWAY_DATABASE_URL=postgresql://...

# Then run:
node scripts/insert-browse-data.js
```

## What Gets Inserted

**Current configuration (≥4 movies threshold):**
- **3,488 browse collections** across 35 genres
- **~101,718 movie assignments** (movies linked to collections)

**Sample collections:**
- "WWII Espionage Thrillers" (26 movies)
- "1940s Film Noir" (11 movies)
- "Newsroom Dramas" (42 movies)
- "Corporate Corruption Thrillers" (22 movies)

## Insertion Process

The script will:

1. ✅ Transform browse data from JSON files (≥4 threshold)
2. 🔗 Connect to Railway PostgreSQL
3. 🔍 Verify schema exists (`browse_lists`, `list_movies`, `movies`)
4. 🗺️ Build TMDB ID → UUID mapping from `movies` table
5. 📝 Insert 3,488 collections in batches
6. 🎬 Insert ~101K movie assignments (with UUID mapping)
7. ✅ Verify insertion and show stats

## Expected Output

```
🚀 Starting Browse Data Insertion...

📊 Using threshold: ≥4 movies per collection

📊 Transforming browse data...
✅ Transformed 3,488 collections with 101,718 movie assignments

🔗 Connecting to Railway PostgreSQL...
✅ Connected

🔍 Checking database schema...
✅ Found tables: browse_lists, list_movies, movies

🗺️ Building TMDB ID → UUID mapping...
✅ Mapped 1,234 movies

📝 Inserting browse collections...
  Progress: 3488/3488 collections...
✅ Inserted 3,488 collections (0 skipped)

🎬 Inserting movie assignments...
  Progress: 101718/101718 assignments...
✅ Inserted 98,234 movie assignments
   3,484 movies not found in database
   0 assignments skipped

🔍 Verifying insertion...
✅ Verification:
   Active lists: 3,488
   Total assignments: 98,234
   Average movies per list: 28.2

🎉 Browse data insertion complete!

📝 Next steps:
   1. Test search: node scripts/test-browse-search.js
   2. Update /api/universal-search to query database
   3. Verify data quality: node scripts/check-browse-schema.js
```

## Troubleshooting

### Error: "RAILWAY_DATABASE_URL or DATABASE_URL must be set"

**Solution**: Set the environment variable:
```bash
RAILWAY_DATABASE_URL=postgresql://... node scripts/insert-browse-data.js
```

### Error: "Browse lists schema not installed!"

**Solution**: Install the schema first:
```bash
RAILWAY_DATABASE_URL=postgresql://... node scripts/install-browse-schema.js
```

### Error: "Movies table not found!"

**Solution**: Ensure your database has the `movies` table with data.

### Warning: "X movies not found in database"

**Cause**: Browse collections reference movies by TMDB ID, but some movies aren't in your `movies` table yet.

**Impact**: Those movie assignments will be skipped. Collections will still be created.

**Solution** (optional): Insert more movies into your `movies` table and re-run the script (it uses `ON CONFLICT DO NOTHING` so it won't duplicate data).

## Re-running the Script

The script is **idempotent** - safe to run multiple times:

- Collections: Uses `ON CONFLICT (title) DO NOTHING`
- Movie assignments: Uses `ON CONFLICT (list_id, movie_id) DO NOTHING`

If you want to **change the threshold** and re-insert:

```bash
# Clear existing data first
RAILWAY_DATABASE_URL=postgresql://... node scripts/reset-browse-schema.js

# Insert with new threshold
MIN_MOVIES=3 RAILWAY_DATABASE_URL=postgresql://... node scripts/insert-browse-data.js
```

## Changing the Threshold

See `scripts/BROWSE_DATA_CONFIG.md` for threshold options (3, 4, 5, 6, 8, 10).

Current default is **≥4 movies** (3,488 collections).
