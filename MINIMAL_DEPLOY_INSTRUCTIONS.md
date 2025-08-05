# MovieGenius-Minimal Railway Deployment Instructions

## 1. Prepare the Project

```bash
cd /Users/josh.petersen/moviegenius-minimal
npm install @supabase/supabase-js
```

## 2. Create Railway Project

1. Go to railway.app
2. Create New Project
3. Deploy from GitHub repo OR upload project files

## 3. Environment Variables

Add these EXACT variables to Railway (same as main project):

```
NEXT_PUBLIC_SUPABASE_URL=https://tjvaplqqibvlmazdvcwx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzM3MzIwNCwiZXhwIjoyMDMyOTQ5MjA0fQ.WxNKk_DF4V1hpiZ6b0WQcg_4vbiwxaF
```

## 4. Test Endpoints After Deployment

Test the minimal API endpoint:
```bash
curl https://[your-railway-url]/api/random-analysis
```

## Expected Results

**If Railway connectivity issue:**
- Minimal app will ALSO fail with "TypeError: fetch failed"
- Proves the issue is Railway → Supabase connectivity

**If codebase issue:**
- Minimal app will work and return movie data
- Proves the issue is in main codebase complexity

## 5. Alternative Test Endpoint

If needed, I can add a simpler test endpoint that just tests basic connectivity without querying movies table.