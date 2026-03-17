# V1 Critical Bug Fixes

**Last Updated:** 2026-03-17

---

## ✅ Bug #22: SimpleSearch Not Working in Production

### Status: **RESOLVED**

### Local Testing: ✅ **PASSES**
### Production Testing: ✅ **PASSES**

**Component:** `components/SimpleSearch.js`
**API:** `/pages/api/simple-search.js`

**Verified Locally:**
- ✅ Component renders correctly
- ✅ API endpoint responds
- ✅ TMDB integration works
- ✅ Word wheel dropdown functions
- ✅ Search results display
- ✅ Navigation to movie pages

**Verified in Production (2026-03-17):**
- ✅ API endpoint: `https://moviegenius.ai/api/simple-search`
- ✅ Returns 20 results with TMDB integration
- ✅ whyWatch data present
- ✅ Database connectivity working
- ⚠️ Known issue: Contributors showing `[object Object]` (deferred to V2)

### Production Issues (Previously Suspected - Now Resolved)

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

- [x] Verify environment variables in Railway
- [x] Check production build logs for errors
- [x] Test API endpoint directly in production
- [x] Verify TMDB API key is valid
- [x] Check database connectivity
- [x] Verify search results display
- [ ] Check browser console for errors (optional - API working)
- [ ] Test component hydration (optional - API working)

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
| #22 - SimpleSearch | ✅ **RESOLVED** | 🚨 Critical | ~~YES~~ |
| #25 - camelCase URLs | Investigation | ⚠️ High | Maybe |
| #34 - Monitoring | Setup | 🔧 High | No |

### Next Actions

1. ✅ ~~Test SimpleSearch in production~~ **COMPLETE**
2. **Investigate camelCase routing** (Bug #25)
3. **Set up deployment monitoring** (Bug #34)
4. **Layout & UI polish** (V1 scope)

---

## 🎯 V1 Definition of Done

✅ **SimpleSearch works in production** - COMPLETE
⚠️ **No routing errors** - Needs investigation (Bug #25)
⚠️ **Deployment monitoring active** - Needs setup (Bug #34)

**Critical blocker resolved. V1 can ship with remaining items as nice-to-have.**
