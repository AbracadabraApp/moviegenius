# 🚨 Emergency Rollback Procedures

## Quick Rollback Commands

### 1. **Immediate Rollback (Last Commit)**
```bash
# If the latest deployment is causing issues
git revert HEAD --no-edit
git push
```

### 2. **Rollback to Specific Commit**
```bash
# Find the target commit
git log --oneline -10

# Rollback to specific commit (replace COMMIT_HASH)
git revert COMMIT_HASH --no-edit
git push
```

### 3. **Nuclear Option - Hard Reset** ⚠️
```bash
# DANGER: Only use if absolutely necessary
# This will lose any uncommitted changes
git reset --hard GOOD_COMMIT_HASH
git push --force-with-lease
```

## 🎯 **Recent Safe Rollback Points**

Based on recent stable deployments:

- **0b4d82fc** - Explore page static generation fixes (STABLE)
- **ee380ae4** - Prettier formatting applied (STABLE)
- **cbdb8716** - Railway build failures resolved (STABLE)

## 📊 **Rollback Impact Assessment**

### Current Latest Commit: `813be267`
**Changes that would be reverted:**
- Enhanced ErrorBoundary component
- Error boundaries in movie pages (`pages/movie/[id].js`)
- Error boundaries in movies listing (`pages/movies.js`) 
- Error boundaries in search page (`pages/search.js`)
- Webpack optimizations in `next.config.js`
- Bundle monitoring script
- Package dependencies updates

**Rollback Safety:** ✅ SAFE
- No database schema changes
- No API breaking changes
- Only UI/UX enhancements would be lost
- Core functionality remains intact

## 🚦 **Rollback Decision Matrix**

| Issue Type | Action | Timeline |
|------------|--------|----------|
| **Build Failure** | Immediate rollback | < 5 minutes |
| **Critical Runtime Error** | Immediate rollback | < 5 minutes |
| **Performance Degradation** | Monitor 15min, then rollback | < 20 minutes |
| **UI/UX Issues** | Monitor 1 hour, then rollback | < 1 hour |
| **Minor Issues** | Fix forward, no rollback | N/A |

## 🔍 **Post-Rollback Checklist**

After performing a rollback:

1. **Verify Deployment**
   ```bash
   # Check Railway deployment status
   gh api repos/AbracadabraApp/moviegenius/deployments
   ```

2. **Test Critical Paths**
   - [ ] Homepage loads
   - [ ] Movie search works
   - [ ] Movie detail pages load
   - [ ] Navigation functions

3. **Monitor Logs**
   - Check Railway logs for errors
   - Monitor user error reports
   - Check performance metrics

4. **Communication**
   - Update team on rollback
   - Document issue for post-mortem
   - Plan fix-forward strategy

## ⚡ **Railway-Specific Rollback**

If git rollback isn't sufficient:

1. **Railway Dashboard Rollback**
   - Go to Railway dashboard
   - Find previous successful deployment
   - Click "Redeploy" on that version

2. **Environment Variable Rollback**
   ```bash
   # If environment variables changed
   railway variables set KEY=OLD_VALUE
   railway redeploy
   ```

## 📞 **Emergency Contacts**

When rollback is needed:
- **Developer**: Available during work hours
- **System**: Self-healing with error boundaries
- **Users**: Graceful degradation, not complete failure

## 🛡️ **Prevention Measures**

To reduce rollback needs:
- ✅ Error boundaries implemented (current)
- ✅ Staged deployments via Railway
- ✅ Build-time error detection
- ✅ Static generation validation
- 🔄 Monitoring and alerting (in progress)

---

**Last Updated:** July 21, 2025  
**Created By:** Claude Code Assistant  
**Review Schedule:** Monthly or after major deployments