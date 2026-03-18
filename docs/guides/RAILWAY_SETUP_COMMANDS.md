# Railway Setup Commands for MovieGenius-Minimal

## Option 1: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# In the moviegenius-minimal directory
cd /Users/josh.petersen/moviegenius-minimal

# Initialize Railway project
railway init

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://tjvaplqqibvlmazdvcwx.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzM3MzIwNCwiZXhwIjoyMDMyOTQ5MjA0fQ.WxNKk_DF4V1hpiZ6b0WQcg_4vbiwxaF

# Deploy
railway up
```

## Option 2: GitHub Integration

1. Create new GitHub repo for moviegenius-minimal
2. Push the minimal project to GitHub
3. Connect Railway to the new repo
4. Add environment variables in Railway dashboard
5. Deploy automatically

## Test Commands After Deployment

```bash
# Test basic connectivity
curl https://[your-railway-url]/api/db-test

# Test movie query
curl https://[your-railway-url]/api/random-analysis

# Check deployment logs
railway logs
```

## Expected URL Pattern
Railway will give you a URL like: `https://moviegenius-minimal-production-xxxx.up.railway.app`