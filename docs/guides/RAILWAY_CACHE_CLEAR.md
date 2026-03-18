# Railway Cache Clear Instructions

## Method 1: Railway Dashboard (Recommended)
1. Go to https://railway.app/dashboard
2. Select your moviegenius project
3. Go to Settings → General
4. Find "Build Cache" section
5. Click "Clear Build Cache"
6. Trigger new deployment by pushing a commit or clicking "Deploy"

## Method 2: Railway CLI
```bash
# Login to Railway
railway login

# Link to your project
railway link

# Clear cache and redeploy
railway deploy --clear-cache

# Alternative: Force rebuild
railway up --service <service-name>
```

## Method 3: Environment Variable Toggle
Add a cache-busting environment variable:
- Name: `CACHE_BUST`
- Value: `$(date +%s)` or any random string
- This forces Railway to rebuild from scratch

## Method 4: Force Rebuild via Commit
```bash
# Make a trivial change to force rebuild
echo "# Cache clear $(date)" >> .railway-cache-clear
git add .railway-cache-clear
git commit -m "Force Railway cache clear and rebuild"
git push
```

## Verification Steps
After clearing cache:
1. Monitor Railway build logs for nuclear-static directory inclusion
2. Check if getStaticPaths generates prebuild paths
3. Test nuclear static file access via our diagnostics
4. Run production testing framework

## Expected Results
- Build logs should show nuclear-static files being copied
- getStaticPaths should log nuclear health check results
- Movie pages should load without 404 redirects
- Production test framework should show success