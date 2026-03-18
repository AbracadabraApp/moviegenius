# Enable Development Mode in Railway for Hydration Debugging

## Steps to Enable Development Mode (TEMPORARY)

### Via Railway Dashboard:
1. Go to https://railway.app/dashboard
2. Select your moviegenius project
3. Go to Variables tab
4. Add new environment variable:
   - **Name**: `NODE_ENV`
   - **Value**: `development`
5. Deploy the change

### Via Railway CLI (if authenticated):
```bash
railway variables set NODE_ENV=development
railway deploy
```

## What This Does:
- **Reveals non-minified React error messages** instead of "Minified React error #418"
- **Shows exact hydration mismatch details** with component names and line numbers
- **Enables detailed debugging information** for production issues

## Important Notes:
- ⚠️ **TEMPORARY ONLY** - This is for debugging only
- 🎯 **Revert after diagnosis** - Change back to `NODE_ENV=production` once we identify the issue
- 📊 **Test immediately** - Go to `/movie/11` and run `window.generateProdMovieTestReport()` in console

## Expected Results:
After enabling development mode and testing `/movie/11`:
1. Browser console will show detailed React error messages
2. Production testing framework will capture specific hydration failure points
3. We'll see exact component and line number causing the mismatch

## Next Steps:
1. Enable the environment variable
2. Wait 2-3 minutes for Railway to redeploy
3. Test `/movie/11` in browser
4. Open browser console and run: `window.generateProdMovieTestReport()`
5. Share the detailed error report for targeted fixes