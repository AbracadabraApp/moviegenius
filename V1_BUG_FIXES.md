# V1 Critical Bug Fixes

**Last Updated:** 2026-03-17

---

## 🚨 Bug #22: SimpleSearch Not Working in Production

### Status: **Needs Production Testing**

### Local Testing: ✅ **PASSES**

**Component:** `components/SimpleSearch.js`
**API:** `/pages/api/simple-search.js`

**Verified Locally:**
- ✅ Component renders correctly
- ✅ API endpoint responds
- ✅ TMDB integration works
- ✅ Word wheel dropdown functions
- ✅ Search results display
- ✅ Navigation to movie pages

### Production Issues (Suspected)

Since local testing passes, production failure likely caused by:

**1. Environment Variables Missing**
```bash
# Check Railway environment:
RAILWAY_DATABASE_URL=...
DATABASE_URL=...
TMDB_BEARER_TOKEN=...
TMDB_API_KEY=...
```

**2. Build/Deploy Issues**
- Next.js build failure?
- Static optimization issues?
- API routes not deploying?

**3. Client-Side Errors**
- Hydration mismatch?
- JavaScript errors blocking component?
- CORS issues?

### Testing Protocol

**Step 1: Check Railway Environment**
```bash
# Railway dashboard → Environment Variables
# Verify all required variables are set
```

**Step 2: Check Build Logs**
```bash
# Railway → Deployments → Latest Build
# Look for errors in build output
```

**Step 3: Check Production Console**
```bash
# Open production site in browser
# Open DevTools Console
# Look for JavaScript errors
```

**Step 4: Test API Directly**
```bash
curl -X POST https://your-production-url.railway.app/api/simple-search \
  -H "Content-Type: application/json" \
  -d '{"query":"star wars"}'
```

**Step 5: Check Network Tab**
```
# In browser DevTools
# Network → XHR/Fetch
# Look for failed requests
# Check request/response payloads
```

### Fix Checklist

- [ ] Verify environment variables in Railway
- [ ] Check production build logs for errors
- [ ] Test API endpoint directly in production
- [ ] Check browser console for errors
- [ ] Verify TMDB API key is valid
- [ ] Check database connectivity
- [ ] Test component hydration
- [ ] Verify search results display

### Known Working Code

The code has been verified locally. If production fails:
1. It's an environment/config issue, not code
2. Check Railway deployment settings
3. Verify all secrets are set correctly

---

## ⚠️  Bug #25: camelCase URL Routing Issues

### Status: **Needs Investigation**

### Issue Description

From RELEASE_TODO:
> Fix camelCase URLs in episode routing - may cause production issues

### Investigation Needed

**1. Identify Affected Routes**
```bash
# Find camelCase route files
find pages -name "*[A-Z]*" -type f
```

**2. Check Next.js Routing Convention**
- Next.js prefers kebab-case: `/my-route`
- Not camelCase: `/myRoute`

**3. Potential Issues**
- Case-sensitive routing in production
- URL normalization problems
- SEO issues

### Testing Protocol

**Step 1: Audit Route Files**
```bash
# List all page files
ls -R pages/

# Look for mixed case files
```

**Step 2: Test in Production**
- Visit URLs with different cases
- Check for 404 errors
- Verify redirects work

**Step 3: Fix if Needed**
- Rename files to kebab-case
- Add redirects for old URLs
- Update all internal links

### Fix Checklist

- [ ] Audit all route files
- [ ] Identify camelCase routes
- [ ] Test routes in production
- [ ] Rename files if needed
- [ ] Add redirects
- [ ] Update internal links

---

## 🔧 Bug #34: Deployment Monitoring System

### Status: **Infrastructure Setup**

### Goal

Create automated deployment monitoring to detect and fix deployment failures.

### Requirements

**1. Railway CLI Integration**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link
```

**2. Deployment Health Checks**
```bash
# Check deployment status
railway status

# View logs
railway logs

# Check environment
railway variables
```

**3. Automated Monitoring Script**

Create `scripts/monitor-deployment.js`:
```javascript
// Monitor Railway deployment health
// - Check build status
// - Verify API endpoints
// - Test critical pages
// - Alert on failures
```

### Testing Protocol

**Step 1: Manual Health Check**
- [ ] Check Railway dashboard
- [ ] Verify build succeeded
- [ ] Test API endpoints
- [ ] Check critical pages

**Step 2: Automated Monitoring**
- [ ] Run monitoring script
- [ ] Verify all checks pass
- [ ] Test failure detection

**Step 3: Alert System**
- [ ] Set up notifications
- [ ] Test alert triggers
- [ ] Verify alert delivery

### Fix Checklist

- [ ] Install Railway CLI
- [ ] Create monitoring script
- [ ] Test health checks
- [ ] Set up alerts
- [ ] Document runbook
- [ ] Schedule regular checks

---

## 📋 Summary

| Issue | Status | Priority | Blocker? |
|-------|--------|----------|----------|
| #22 - SimpleSearch | Production Testing | 🚨 Critical | **YES** |
| #25 - camelCase URLs | Investigation | ⚠️ High | Maybe |
| #34 - Monitoring | Setup | 🔧 High | No |

### Next Actions

1. **Test SimpleSearch in production** (highest priority)
2. **Verify environment variables** in Railway
3. **Check production logs** for errors
4. **Investigate camelCase routing** if time permits
5. **Set up monitoring** after critical bugs fixed

---

## 🎯 V1 Definition of Done

✅ **SimpleSearch works in production**
✅ **No routing errors**
✅ **Deployment monitoring active**

**Only then can V1 ship.**
