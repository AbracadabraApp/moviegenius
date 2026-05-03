# Catalog Refresh Setup Guide

## Overview

Automated daily catalog refresh job that fetches new releases from TMDB and uses the UseOnce policy to persist and enrich movies.

## Components

### 1. Refresh Script
**File:** `scripts/refresh-catalog.js`

**What it does:**
- Fetches from 4 TMDB endpoints:
  - Now Playing
  - Upcoming
  - Trending This Week
  - Popular
- Deduplicates movies by TMDB ID
- Persists new movies to database
- Triggers background enrichment (slug, WhyWatch, MoreIdeas)

**Run manually:**
```bash
node scripts/refresh-catalog.js
```

### 2. Manual Trigger API
**Endpoint:** `POST /api/admin/refresh-catalog`

**What it does:**
- Executes the refresh script on demand
- Returns job summary with statistics
- Useful for testing and manual updates

**Test locally:**
```bash
curl -X POST http://localhost:3000/api/admin/refresh-catalog
```

### 3. Monitoring API
**Endpoint:** `GET /api/admin/catalog-status`

**What it does:**
- Returns catalog health statistics:
  - Total movies
  - Movies with slug/analysis
  - Movies added in last 24h/week/month
  - WhyWatch statistics
  - MoreIdeas statistics
  - Recent additions (last 10 movies)

**Test locally:**
```bash
curl http://localhost:3000/api/admin/catalog-status
```

## Railway Cron Setup

### Option 1: Railway Cron Service (Recommended)

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Click "+ New" → "Cron Job"

2. **Configure the Cron Job**
   ```
   Name: Catalog Refresh
   Schedule: 0 6 * * *  (Daily at 6 AM UTC)
   Command: node scripts/refresh-catalog.js
   ```

3. **Environment Variables**
   - Automatically inherits from main service
   - Ensure these are set:
     - `DATABASE_URL` or `RAILWAY_DATABASE_URL`
     - `NEXT_PUBLIC_TMDB_API_KEY`

4. **Deploy**
   - Railway will run the cron job on schedule
   - Check logs in Railway dashboard

### Option 2: External Cron (Alternative)

If Railway cron is not available, use an external service like:

**GitHub Actions:**
```yaml
# .github/workflows/refresh-catalog.yml
name: Refresh Catalog
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger refresh
        run: |
          curl -X POST ${{ secrets.RAILWAY_URL }}/api/admin/refresh-catalog
```

**Or any cron service:**
```bash
# crontab -e
0 6 * * * curl -X POST https://your-app.railway.app/api/admin/refresh-catalog
```

## Cost Estimate

**Claude API costs** (assuming 20 new movies per day):
- Slug generation: 20 × $0.003 = $0.06/day
- WhyWatch generation: 20 × $0.015 = $0.30/day
- MoreIdeas generation: 20 × $0.015 = $0.30/day

**Total:** ~$0.66/day = **~$20/month**

**Note:** This only applies to NEW movies. Existing movies are not re-enriched.

## Monitoring

### Check Job Health
```bash
curl https://your-app.railway.app/api/admin/catalog-status
```

### View Recent Additions
The status endpoint includes the last 10 movies added:
```json
{
  "recent_additions": [
    {
      "tmdb_id": 12345,
      "title": "Example Movie",
      "year": 2024,
      "created_at": "2024-03-28T10:00:00.000Z"
    }
  ]
}
```

### Railway Logs
- Check Railway dashboard for cron job logs
- Each run logs:
  - Movies fetched per category
  - New movies added
  - Enrichment triggers
  - Duration

## Troubleshooting

### Cron job not running
1. Check Railway dashboard → Cron Jobs → Logs
2. Verify schedule is correct (cron syntax)
3. Ensure environment variables are set

### No new movies being added
1. Check TMDB API key is valid
2. Verify database connection
3. Check logs for errors

### Enrichment not triggering
1. Verify enrichment API endpoints exist:
   - `/api/generate-slug`
   - `/api/generate-why-watch`
   - `/api/generate-more-ideas`
2. Check Claude API key is set
3. Review Railway logs for enrichment errors

## Manual Testing

### Test the refresh script locally:
```bash
node scripts/refresh-catalog.js
```

### Test the manual trigger API:
```bash
curl -X POST http://localhost:3000/api/admin/refresh-catalog
```

### Test the status endpoint:
```bash
curl http://localhost:3000/api/admin/catalog-status | jq
```

## Next Steps

1. ✅ Create cron job in Railway dashboard
2. ✅ Test manual trigger API
3. ✅ Monitor first automated run
4. ✅ Set up alerting (optional) for job failures
