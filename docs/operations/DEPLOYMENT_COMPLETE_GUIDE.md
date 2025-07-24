# 🚀 Complete Deployment Guide

This comprehensive guide covers all aspects of deploying MovieGenius to production, including Railway setup, environment configuration, and troubleshooting.

## 🎯 Overview

MovieGenius uses Railway for production hosting with the following architecture:
- **Frontend**: Next.js with nuclear static generation
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis + HTTP + ISR
- **AI**: Claude API for movie analysis
- **External APIs**: TMDB for movie data

## 🏗️ Production Architecture

### Infrastructure Components
- **Railway**: Primary hosting platform
- **Domain**: moviegenius.ai with automatic SSL
- **CDN**: Railway's built-in CDN
- **Database**: Supabase hosted PostgreSQL
- **Cache**: Redis (Railway addon or Upstash)

### Performance Targets
- **Page Load**: <200ms for nuclear static pages
- **Cache Hit Rate**: >95%
- **Uptime**: 99.9%
- **Build Time**: <5 minutes

## ⚙️ Railway Configuration

### Project Setup
1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and link project
   railway login
   railway link
   ```

2. **Configure Domain**
   - Go to Railway dashboard → Settings → Domains
   - Add custom domain: `moviegenius.ai`
   - Configure DNS records at domain registrar

3. **Add Redis Addon**
   - Railway dashboard → Add Service → Redis
   - Note the connection URL for environment variables

### Environment Variables

**Required Variables:**
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-...

# External APIs
NEXT_PUBLIC_TMDB_API_KEY=your-tmdb-api-key

# Cache
REDIS_URL=redis://default:password@redis-url:port
CACHE_ENABLED=true

# Deployment
NODE_ENV=production
FORCE_DEPLOY=2025-07-24T12:00:00Z
```

**Optional Variables:**
```bash
# Cache Warming
CACHE_WARMING_TOKEN=secure-random-token

# Monitoring
NEXT_PUBLIC_BASE_URL=https://moviegenius.ai

# Performance
MAX_NUCLEAR_BATCH_SIZE=50
NUCLEAR_GENERATION_ENABLED=true
```

### Build Configuration

**railway.toml:**
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "never"

[env]
NODE_ENV = "production"
FORCE_DEPLOY = "2025-07-24T12:00:00Z"
```

## 🚀 Deployment Process

### 1. Pre-Deployment Checklist
```bash
# Run all tests
npm test
npm run test:nuclear

# Check code quality
npm run lint
npm run typecheck

# Verify environment variables
node -e "console.log('SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log('ANTHROPIC_KEY:', !!process.env.ANTHROPIC_API_KEY)"

# Test nuclear system locally
npm run nuclear:test
```

### 2. Deploy to Railway
```bash
# Commit changes
git add .
git commit -m "feat: Deploy production updates"
git push origin main

# Monitor deployment
railway logs --follow
```

### 3. Post-Deployment Verification
```bash
# Check health endpoint
curl "https://moviegenius.ai/api/health"

# Test movie pages
curl -I "https://moviegenius.ai/movie/550"
curl -I "https://moviegenius.ai/movie/238"
curl -I "https://moviegenius.ai/movie/11"

# Verify nuclear system
curl "https://moviegenius.ai/api/nuclear-status"

# Test search functionality
curl -X POST "https://moviegenius.ai/api/health" \
  -H "Content-Type: application/json" \
  -d '{"query": "Fight Club"}'
```

## 🔧 Nuclear Static Deployment

### Build Process
The nuclear static system pre-generates movie pages for instant loading:

1. **During Build:**
   ```bash
   # Build process automatically generates nuclear static files
   npm run build
   # This creates public/nuclear-static/*.json files
   ```

2. **Static File Serving:**
   - Files served directly from `/nuclear-static/[tmdbId].json`
   - No server-side processing required
   - Cached aggressively at CDN level

3. **Fallback Strategy:**
   - If nuclear file missing, fall back to dynamic generation
   - Analysis service creates content on-demand
   - Generated content cached for future requests

### Nuclear System Status
Monitor nuclear system health:
```bash
# Check nuclear coverage
curl "https://moviegenius.ai/api/nuclear-status"

# Should return:
# - total_movies: 17333
# - nuclear_files: 6024+
# - conversion_rate: >99%
```

## 🗄️ Database Configuration

### Supabase Setup
1. **Create Supabase Project**
   - Go to supabase.com
   - Create new project
   - Note URL and service role key

2. **Configure Database Schema**
   ```sql
   -- Ensure proper indexes exist
   CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
   CREATE INDEX IF NOT EXISTS idx_movie_analyses_movie_id ON movie_analyses(movie_id);
   CREATE INDEX IF NOT EXISTS idx_movie_analyses_type ON movie_analyses(analysis_type);
   ```

3. **Row Level Security (RLS)**
   ```sql
   -- Enable RLS for public access
   ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow public read access" ON movies FOR SELECT USING (true);
   ```

### Connection Pooling
```javascript
// Optimized for serverless functions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false },
    global: { 
      headers: { 'x-client': 'moviegenius-production' } 
    }
  }
);
```

## 🚄 Cache Strategy

### Multi-Layer Caching
1. **Redis Cache (L1)**
   - Analysis content: 30 days TTL
   - TMDB data: 90 days TTL
   - Search results: 24 hours TTL

2. **HTTP Cache (L2)**
   - Movie pages: 7 days with stale-while-revalidate
   - API endpoints: 30 days for analysis, 24 hours for search
   - Static assets: 1 year

3. **CDN Cache (L3)**
   - Railway CDN caches static content globally
   - Nuclear static files cached at edge
   - Automatic compression and optimization

### Cache Warming
```bash
# Warm cache after deployment
npm run cache:warm -- --type=popular --limit=100
npm run cache:warm -- --type=series --limit=50

# Background analysis warming (optional, ~$500 cost)
curl -X POST "https://moviegenius.ai/api/background-analysis-warming" \
  -H "Authorization: Bearer $CACHE_WARMING_TOKEN" \
  -d '{"action": "start", "priority": "normal"}'
```

## 📊 Monitoring & Alerts

### Health Checks
Railway automatically monitors:
- `/api/health` endpoint every 30 seconds
- HTTP 200 response required
- 300 second timeout

### Performance Monitoring
```bash
# Monitor page load times
curl -w "@curl-format.txt" -o /dev/null -s "https://moviegenius.ai/movie/550"

# Check cache hit rates
curl "https://moviegenius.ai/api/cache-status"

# Monitor error rates
# Check Railway dashboard → Metrics
```

### Log Monitoring
```bash
# View Railway logs
railway logs --follow

# Key log patterns to monitor:
# - "Nuclear static loaded" (good)
# - "Analysis generation failed" (alert)
# - "Database connection error" (critical)
# - "TMDB API error" (warning)
```

## 🚨 Troubleshooting Production Issues

### Common Deployment Issues

**1. Build Failures**
```bash
# Check build logs in Railway dashboard
# Common causes:
# - Missing environment variables
# - TypeScript errors
# - Test failures
# - Memory limits exceeded
```

**2. Runtime Errors**
```bash
# Check if nuclear static files exist
curl "https://moviegenius.ai/nuclear-static/550.json"

# Test database connectivity
curl "https://moviegenius.ai/api/health"

# Verify environment variables
# Railway dashboard → Variables
```

**3. Performance Issues**
```bash
# Check nuclear system status
curl "https://moviegenius.ai/api/nuclear-status"

# Monitor cache performance
# Should see >95% cache hit rate

# Check database query performance
# Supabase dashboard → Performance
```

### Emergency Procedures

**Quick Rollback:**
```bash
# Immediate rollback
git revert HEAD --no-edit
git push

# Or use Railway dashboard
# Go to Deployments → Previous deployment → Redeploy
```

**Force Deployment:**
```bash
# If Railway not picking up changes
# Railway dashboard → Variables
# Update FORCE_DEPLOY to current timestamp
FORCE_DEPLOY=2025-07-24T15:30:00Z
```

**Nuclear System Recovery:**
```bash
# If nuclear system is broken
# Clear problematic files and regenerate
rm -rf public/nuclear-static/
npm run nuclear:batch -- --count=100
```

## 🔐 Security Considerations

### API Keys
- Never commit API keys to repository
- Use Railway environment variables only
- Rotate keys periodically
- Monitor API usage for anomalies

### Database Security
- Use service role key, not anon key for server operations
- Enable Row Level Security (RLS) on all tables
- Monitor for suspicious query patterns
- Regular security updates

### Domain Security
- HTTPS enforced automatically by Railway
- Custom domain properly configured
- No mixed content warnings
- Secure headers implemented

## 📈 Performance Optimization

### Build Optimization
```javascript
// next.config.mjs optimizations
export default {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Image optimization
  images: {
    domains: ['image.tmdb.org'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/nuclear-static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=2592000, stale-while-revalidate=5184000',
          },
        ],
      },
    ];
  },
};
```

### Runtime Optimization
- Nuclear static files served directly
- Aggressive caching at all levels
- Database connection pooling
- Compressed responses
- Optimized images via TMDB

## 🎯 Deployment Success Metrics

### Technical Metrics
- ✅ Build time: <5 minutes
- ✅ Page load: <200ms for nuclear pages
- ✅ Cache hit rate: >95%
- ✅ Error rate: <0.1%
- ✅ Uptime: 99.9%

### User Experience Metrics
- ✅ Movie pages load instantly
- ✅ Search returns results in <1 second
- ✅ Navigation is smooth and responsive
- ✅ Mobile experience is optimized
- ✅ No broken links or missing content

### Business Metrics
- ✅ API costs optimized through caching
- ✅ Server costs minimal due to static generation
- ✅ Maintenance overhead low
- ✅ Scalability proven with current architecture

---

## 📚 Related Documentation

- **[Cache Optimization Report](CACHE_OPTIMIZATION_REPORT.md)** - Detailed caching strategy
- **[Railway Deployment Status](RAILWAY_DEPLOYMENT_STATUS.md)** - Current deployment status
- **[Rollback Procedures](ROLLBACK_PROCEDURES.md)** - Emergency recovery procedures
- **[Nuclear Static Generation](../architecture/NUCLEAR_STATIC_GENERATION_PROCESS.md)** - Core performance system
- **[Troubleshooting Guide](../TROUBLESHOOTING.md)** - Common issues and solutions

---

*This guide consolidates all deployment-related information into a single comprehensive resource. For specific issues, see the Troubleshooting Guide.*

*Last updated: July 24, 2025*