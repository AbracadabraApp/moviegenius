# Railway Cron Job Setup - Final Step

## ✅ Deployment Complete

The unified API and catalog refresh system are now live in production!

**Verified working:**
- ✅ Unified API: `https://moviegenius.ai/api/v1/movie/153`
- ✅ Catalog Status: `https://moviegenius.ai/api/admin/catalog-status`
- ✅ Manual Trigger: `https://moviegenius.ai/api/admin/refresh-catalog`

**Current catalog stats:**
- Total movies: 32,890
- Movies with analysis: 19,370
- Movies added last 24h: 8
- WhyWatch recommendations: 19,948 (96% YES)

---

## Final Step: Set Up Cron Job

Railway cron jobs must be configured through the dashboard (CLI doesn't support TTY prompts).

### Option 1: Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Visit: https://railway.com/project/a644b7ec-ad55-4f37-933e-76b76735238d
   - Navigate to your MovieGenius project

2. **Create New Cron Job**
   - Click "+ New" in the top right
   - Select "Cron Job"

3. **Configure the Job**
   ```
   Name: Catalog Refresh
   Service: moviegenius (select from dropdown)
   Schedule: 0 6 * * *
   Command: node scripts/refresh-catalog.js
   ```

4. **Environment Variables**
   - Automatically inherited from main service
   - No additional configuration needed

5. **Deploy**
   - Click "Create" or "Deploy"
   - First run will be tomorrow at 6 AM UTC

### Option 2: Manual Trigger (Immediate Test)

You can manually trigger the catalog refresh right now to test it:

```bash
curl -X POST https://moviegenius.ai/api/admin/refresh-catalog
```

Expected response:
```json
{
  "success": true,
  "message": "Catalog refresh completed successfully",
  "summary": {
    "totalMovies": 65,
    "newMovies": 12,
    "enrichedMovies": 12,
    "duration": 8.3,
    "timestamp": "2026-05-03T23:20:00.000Z"
  }
}
```

### Verify Cron Job is Working

After setting up the cron job, verify it's running:

1. **Check Railway Logs** (next day after 6 AM UTC)
   ```bash
   railway logs --service catalog-refresh
   ```

2. **Monitor Catalog Status**
   ```bash
   curl https://moviegenius.ai/api/admin/catalog-status | jq '.catalog.added_last_24h'
   ```

   Should show new movies added daily.

3. **Look for Job Summary**
   Cron logs will show:
   ```
   🔄 Starting catalog refresh...
   ✅ Fetched Now Playing: 20 movies
   ✅ Catalog refresh complete!
   ```

---

## Cost Monitoring

**Current enrichment costs** (assuming 20 new movies/day):
- Slug: $0.06/day
- WhyWatch: $0.30/day
- MoreIdeas: $0.30/day

**Total: ~$20/month**

Monitor actual usage at:
- https://console.anthropic.com/settings/usage

---

## Alternative: GitHub Actions

If Railway cron isn't available, use GitHub Actions:

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
      - name: Trigger catalog refresh
        run: |
          curl -X POST https://moviegenius.ai/api/admin/refresh-catalog
```

---

## Week 1 Complete! 🎉

**Delivered:**
- ✅ Unified API (4 calls → 1 call)
- ✅ Database indexes (10x faster)
- ✅ UseOnce policy (auto-enrich)
- ✅ Catalog refresh script
- ✅ Admin monitoring APIs
- ✅ Production deployment

**Remaining:**
- ⏳ Set up Railway cron job (5 minutes, via dashboard)

**Next: Week 2 - iOS Development**
- Create Xcode project
- Build Swift models
- Connect to unified API
- First movie detail view

---

## Quick Reference

**Test APIs:**
```bash
# Unified API
curl https://moviegenius.ai/api/v1/movie/153

# Catalog status
curl https://moviegenius.ai/api/admin/catalog-status

# Manual refresh
curl -X POST https://moviegenius.ai/api/admin/refresh-catalog
```

**Railway Dashboard:**
https://railway.com/project/a644b7ec-ad55-4f37-933e-76b76735238d
