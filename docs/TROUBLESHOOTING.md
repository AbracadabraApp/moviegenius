# 🛠️ MovieGenius Troubleshooting Guide

This guide helps resolve common issues with MovieGenius development and production environments.

## 🚨 Emergency Procedures

### Site is Down
```bash
# Quick rollback to last known good state
git revert HEAD --no-edit && git push

# Check Railway deployment status
# Go to Railway dashboard and redeploy if needed

# Verify rollback worked
curl -I "https://moviegenius.ai"
```

### Database Connection Issues
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('movies').select('count').then(console.log);
"
```

## 🎬 Movie Page Issues

### Movie Pages Not Loading

**Symptoms:**
- White screen or error page
- "Movie not found" errors
- Slow loading times

**Diagnosis:**
```bash
# Check if movie exists in database
curl "https://moviegenius.ai/api/movie-analysis?tmdbId=550"

# Check nuclear static files
ls -la public/nuclear-static/550.json

# Check for specific movie
node -e "
const fs = require('fs');
const tmdbId = 550;
try {
  const data = fs.readFileSync(\`public/nuclear-static/\${tmdbId}.json\`, 'utf8');
  console.log('Nuclear static file exists:', tmdbId);
} catch (error) {
  console.log('Nuclear static file missing:', tmdbId);
}
"
```

**Solutions:**
1. **Generate missing nuclear static file:**
   ```bash
   npm run nuclear:batch -- --tmdb-ids=550
   ```

2. **Check environment variables:**
   ```bash
   # Verify all required variables exist
   cat .env.local | grep -E "(SUPABASE|ANTHROPIC|TMDB)"
   ```

3. **Clear cache and restart:**
   ```bash
   npm run dev -- --reset-cache
   ```

### Movie Analysis Not Generating

**Symptoms:**
- "Analysis not yet available" message
- Blank analysis sections
- API errors during generation

**Diagnosis:**
```bash
# Check Claude API key
curl -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3-sonnet-20240229", "max_tokens": 10, "messages": [{"role": "user", "content": "test"}]}'

# Check analysis service
node -e "
const { AnalysisService } = require('./lib/services/analysis-service');
// Test with a simple movie
AnalysisService.generateAnalysis({title: 'Test Movie', year: 2000}).then(console.log).catch(console.error);
"
```

**Solutions:**
1. **Verify API key configuration:**
   ```bash
   # Check if key is properly set
   echo "API Key starts with: ${ANTHROPIC_API_KEY:0:8}..."
   ```

2. **Regenerate analysis manually:**
   ```bash
   # Force regeneration for specific movie
   npm run nuclear:batch -- --tmdb-ids=550 --force
   ```

3. **Check rate limits:**
   - Claude API: 50 requests/minute
   - Wait 60 seconds and retry

## 🔍 Search Issues

### Search Not Working

**Symptoms:**
- Search returns no results
- Search endpoint returns 404
- Search takes too long

**Diagnosis:**
```bash
# Test search endpoint directly
curl -X POST "https://moviegenius.ai/api/health" \
  -H "Content-Type: application/json" \
  -d '{"query": "Fight Club"}'

# Check TMDB API
curl "https://api.themoviedb.org/3/search/multi?api_key=$NEXT_PUBLIC_TMDB_API_KEY&query=Fight%20Club"
```

**Solutions:**
1. **TMDB API issues:**
   ```bash
   # Verify TMDB API key
   echo "TMDB Key: ${NEXT_PUBLIC_TMDB_API_KEY:0:8}..."
   
   # Test TMDB directly
   curl "https://api.themoviedb.org/3/movie/550?api_key=$NEXT_PUBLIC_TMDB_API_KEY"
   ```

2. **Search endpoint routing:**
   - Search uses `/api/health` with POST method
   - Check Railway logs for routing errors

3. **Cache issues:**
   ```bash
   # Clear Redis cache
   npm run cache:clear
   ```

## ⚡ Nuclear Static System Issues

### Nuclear Generation Failing

**Symptoms:**
- Nuclear tests failing
- Static files not generating
- Build process errors

**Diagnosis:**
```bash
# Run nuclear system tests
npm run test:nuclear

# Check nuclear system status
npm run nuclear:status

# Test generation for single movie
npm run nuclear:test
```

**Solutions:**
1. **Dependencies missing:**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database connection:**
   ```bash
   # Test database access
   npm run nuclear:status
   ```

3. **File system permissions:**
   ```bash
   # Check write permissions
   mkdir -p public/nuclear-static
   touch public/nuclear-static/test.json
   rm public/nuclear-static/test.json
   ```

### Nuclear Files Corrupted

**Symptoms:**
- JSON parse errors
- Incomplete movie data
- Missing analysis content

**Diagnosis:**
```bash
# Validate nuclear file format
node -e "
const fs = require('fs');
const file = 'public/nuclear-static/550.json';
try {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('Valid JSON:', Object.keys(data));
} catch (error) {
  console.log('Invalid JSON:', error.message);
}
"
```

**Solutions:**
1. **Regenerate corrupted files:**
   ```bash
   # Remove corrupted file and regenerate
   rm public/nuclear-static/550.json
   npm run nuclear:batch -- --tmdb-ids=550
   ```

2. **Validate all nuclear files:**
   ```bash
   # Run validation script
   npm run validate:nuclear-static
   ```

## 🌐 Deployment Issues

### Railway Deployment Failing

**Symptoms:**
- Builds failing on Railway
- Environment variables missing
- Deployment timeouts

**Diagnosis:**
```bash
# Check recent commits
git log --oneline -5

# Check Railway deployment logs via dashboard
# https://railway.app/dashboard
```

**Solutions:**
1. **Environment variables:**
   - Go to Railway dashboard → Variables
   - Ensure all required variables are set
   - Match local `.env.local` configuration

2. **Build timeouts:**
   ```bash
   # Optimize build process
   npm run build:nuclear-static
   
   # Check bundle size
   npm run analyze
   ```

3. **Manual deployment trigger:**
   ```bash
   # Add FORCE_DEPLOY timestamp
   # In Railway dashboard → Variables
   # Add: FORCE_DEPLOY = 2025-07-24T12:00:00Z
   ```

### Domain/DNS Issues

**Symptoms:**
- Site not accessible
- SSL certificate errors
- Redirect loops

**Diagnosis:**
```bash
# Check DNS resolution
nslookup moviegenius.ai

# Test HTTPS
curl -I "https://moviegenius.ai"

# Check redirects
curl -L -I "https://moviegenius.ai"
```

**Solutions:**
1. **DNS configuration:**
   - Check domain registrar settings
   - Verify Railway domain configuration

2. **SSL issues:**
   - Railway handles SSL automatically
   - Check domain verification in Railway

## 🗄️ Database Issues

### Query Performance Problems

**Symptoms:**
- Slow page loads
- Database timeouts
- High CPU usage

**Diagnosis:**
```bash
# Check database performance
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.time('movie-query');
client.from('movies').select('*').limit(10).then(() => {
  console.timeEnd('movie-query');
});
"
```

**Solutions:**
1. **Add database indexes:**
   ```sql
   -- Add these indexes in Supabase dashboard
   CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
   CREATE INDEX IF NOT EXISTS idx_movie_analyses_movie_id ON movie_analyses(movie_id);
   CREATE INDEX IF NOT EXISTS idx_movie_analyses_type ON movie_analyses(analysis_type);
   ```

2. **Optimize queries:**
   - Use specific column selection
   - Add LIMIT clauses
   - Use proper JOIN conditions

### Database Connection Limits

**Symptoms:**
- "Too many connections" errors
- Random database failures
- Inconsistent behavior

**Solutions:**
1. **Connection pooling:**
   ```javascript
   // Use connection pooling in production
   const supabase = createClient(url, key, {
     db: { schema: 'public' },
     auth: { persistSession: false },
     global: { headers: { 'x-my-custom-header': 'my-app-name' } }
   });
   ```

2. **Close connections properly:**
   ```javascript
   // Always close connections in serverless functions
   export default async function handler(req, res) {
     const supabase = createClient(/* ... */);
     try {
       const result = await supabase.from('movies').select('*');
       res.json(result);
     } finally {
       // Supabase client auto-manages connections
     }
   }
   ```

## 🚀 Performance Issues

### Slow Page Load Times

**Symptoms:**
- Pages taking >2 seconds to load
- Large bundle sizes
- Poor Core Web Vitals

**Diagnosis:**
```bash
# Measure page load times
curl -w "@curl-format.txt" -o /dev/null -s "https://moviegenius.ai/movie/550"

# Check bundle size
npm run analyze

# Test nuclear performance
npm run test:nuclear-performance
```

**Solutions:**
1. **Enable nuclear static system:**
   ```bash
   # Ensure nuclear files exist
   ls -la public/nuclear-static/ | wc -l
   
   # Generate missing files
   npm run nuclear:batch
   ```

2. **Optimize images:**
   ```bash
   # Check image sizes
   find public -name "*.jpg" -o -name "*.png" | xargs ls -lh
   ```

3. **Cache optimization:**
   ```bash
   # Check cache hit rates
   npm run cache:status
   
   # Warm cache with popular content
   npm run cache:warm -- --type=popular --limit=100
   ```

### Memory Issues

**Symptoms:**
- Out of memory errors
- Process crashes
- Slow garbage collection

**Diagnosis:**
```bash
# Check Node.js memory usage
node --max-old-space-size=4096 -e "console.log(process.memoryUsage())"

# Monitor during nuclear generation
npm run nuclear:batch -- --count=10
```

**Solutions:**
1. **Increase memory limit:**
   ```bash
   # In package.json scripts
   "nuclear:batch": "node --max-old-space-size=4096 scripts/nuclear-batch.js"
   ```

2. **Batch processing:**
   ```bash
   # Process in smaller batches
   npm run nuclear:batch -- --count=25
   ```

## 🔧 Development Environment Issues

### Development Server Won't Start

**Symptoms:**
- `npm run dev` fails
- Port conflicts
- Module resolution errors

**Solutions:**
1. **Port conflicts:**
   ```bash
   # Use different port
   npm run dev -- -p 3001
   
   # Kill processes using port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Node modules issues:**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment variables:**
   ```bash
   # Copy example file
   cp .env.example .env.local
   # Edit with your values
   ```

### Testing Issues

**Symptoms:**
- Tests failing unexpectedly
- Jest configuration errors
- Timeout issues

**Solutions:**
1. **Jest configuration:**
   ```bash
   # Run with specific config
   npm run test:nuclear-content
   
   # Debug mode
   npm test -- --verbose
   ```

2. **Test timeouts:**
   ```bash
   # Increase timeout
   export JEST_TIMEOUT=60000
   npm test
   ```

## 📊 Monitoring and Debugging

### Enable Debug Logging

```bash
# Enable debug mode
export DEBUG=moviegenius:*
npm run dev

# Railway logs
# Check Railway dashboard → Deployments → View Logs
```

### Performance Monitoring

```bash
# Monitor nuclear system
npm run nuclear:status

# Check cache performance  
npm run cache:status

# Database query performance
# Use Supabase dashboard → Logs
```

### Error Tracking

```bash
# Check application logs
tail -f logs/application.log

# Check Railway deployment logs
# Railway dashboard → View Logs

# Monitor error rates
# Railway dashboard → Metrics
```

## 🆘 When All Else Fails

### Emergency Rollback Procedure
```bash
# Immediate rollback
git log --oneline -5
git revert HEAD --no-edit
git push

# Nuclear option (use with caution)
git reset --hard LAST_KNOWN_GOOD_COMMIT
git push --force-with-lease
```

### Contact Support
1. **Check existing issues**: Search GitHub issues first
2. **Gather information**: Include error messages, logs, steps to reproduce
3. **Create detailed issue**: Use issue templates
4. **Emergency contact**: For production outages, use priority channels

### Useful Debug Commands
```bash
# System health check
curl "https://moviegenius.ai/api/health"

# Nuclear system status
curl "https://moviegenius.ai/api/nuclear-status"

# Database connectivity
npm run db:status

# Cache status
npm run cache:status

# Complete system check
npm run health:check
```

---

*This troubleshooting guide covers the most common issues. For specific technical details, see the [API Reference](API_REFERENCE.md) and [Architecture Documentation](architecture/).*

*Report issues or suggest improvements to this guide via GitHub issues.*

*Last updated: July 24, 2025*