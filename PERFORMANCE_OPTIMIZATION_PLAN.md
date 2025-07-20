# MovieGenius Performance Optimization Plan

## User Perception Priority Framework

**Current Status:** 5+ second response times (unacceptable for user retention)  
**Target:** <500ms initial load, <2s for dynamic content  
**Priority:** Ordered by user perception impact and implementation effort

---

## 🚨 **Priority 1: Critical Path Optimizations** (Immediate Impact)

### 1.1 Whole Site Caching Strategy ⚡ **HIGHEST IMPACT**

**Problem:** Every request hits expensive Claude API and database queries  
**Impact:** Reduces 5s → 500ms for cached content (90% improvement)

#### Implementation:

```javascript
// pages/api/movie-analysis.js
const CACHE_DURATION = {
  MOVIE_ANALYSIS: 24 * 60 * 60, // 24 hours
  TMDB_DATA: 7 * 24 * 60 * 60, // 7 days
  PERSON_DATA: 7 * 24 * 60 * 60, // 7 days
};

// Redis cache layer
const redis = new Redis(process.env.REDIS_URL);

async function getCachedAnalysis(movieId) {
  const cached = await redis.get(`analysis:${movieId}`);
  if (cached) return JSON.parse(cached);

  // Generate new analysis
  const analysis = await generateClaudeAnalysis(movieId);
  await redis.setex(
    `analysis:${movieId}`,
    CACHE_DURATION.MOVIE_ANALYSIS,
    JSON.stringify(analysis)
  );
  return analysis;
}
```

#### Database Query Caching:

```sql
-- Add database indexes for performance
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movie_analyses_movie_id ON movie_analyses(movie_id);
CREATE INDEX idx_movie_analyses_created_at ON movie_analyses(created_at);
```

### 1.2 Page-Level Caching 📄 **HIGH IMPACT**

**Implementation:** Next.js ISR (Incremental Static Regeneration)

```javascript
// pages/movie/[id].js
export async function getStaticProps({ params }) {
  return {
    props: { movieData },
    revalidate: 86400, // 24 hours
  };
}

export async function getStaticPaths() {
  // Pre-generate top 1000 movies
  const topMovies = await getTopMovies(1000);
  return {
    paths: topMovies.map(id => ({ params: { id: id.toString() } })),
    fallback: 'blocking', // Generate other pages on demand
  };
}
```

---

## 🌐 **Priority 2: CDN & Edge Optimization** (Global Performance)

### 2.1 Cloudflare Setup ☁️ **HIGH IMPACT**

**Benefits:** Global edge caching, image optimization, compression

#### Configuration:

```javascript
// cloudflare-workers.js
export default {
  async fetch(request) {
    // Cache static assets for 1 year
    if (
      request.url.includes('/images/') ||
      request.url.includes('/_next/static/')
    ) {
      const response = await fetch(request);
      response.headers.set(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      );
      return response;
    }

    // Cache movie pages for 1 hour
    if (request.url.includes('/movie/')) {
      return fetch(request, {
        cf: {
          cacheTtl: 3600,
          cacheEverything: true,
        },
      });
    }

    return fetch(request);
  },
};
```

### 2.2 Static Asset Optimization 📦 **MEDIUM-HIGH IMPACT**

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['image.tmdb.org'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },

  compress: true,

  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
    ];
  },
};
```

---

## 🖼️ **Priority 3: Image Optimization** (Visual Performance)

### 3.1 TMDB Image Optimization 🎬 **MEDIUM IMPACT**

**Problem:** Large poster images slow initial render

```javascript
// components/MovieCard.js
import Image from 'next/image';

function MovieCard({ movie }) {
  return (
    <div className="movie-card">
      <Image
        src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
        alt={movie.title}
        width={342}
        height={513}
        placeholder="blur"
        blurDataURL="/placeholder-poster-blur.jpg"
        loading="lazy"
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      />
    </div>
  );
}
```

### 3.2 Lazy Loading Strategy 📱 **MEDIUM IMPACT**

```javascript
// hooks/useIntersectionObserver.js
import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isVisible];
}

// Usage in MovieGrid
function MovieGrid({ movies }) {
  const [gridRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });

  return (
    <div ref={gridRef}>
      {isVisible &&
        movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}
    </div>
  );
}
```

---

## ⚡ **Priority 4: JavaScript Optimization** (Interaction Speed)

### 4.1 Code Splitting & Bundle Optimization 📦 **MEDIUM IMPACT**

```javascript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const MovieAnalysis = dynamic(() => import('../components/MovieAnalysis'), {
  loading: () => <MovieAnalysisSkeleton />,
  ssr: false, // Client-side only for interactive features
});

const PersonModal = dynamic(() => import('../components/PersonModal'), {
  loading: () => <div>Loading...</div>,
});
```

### 4.2 Critical CSS Inlining 🎨 **MEDIUM IMPACT**

```javascript
// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <style
            dangerouslySetInnerHTML={{
              __html: `
              /* Critical CSS for above-fold content */
              .movie-card { /* ... */ }
              .loading-skeleton { /* ... */ }
            `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

---

## 📊 **Priority 5: Database & API Optimization** (Backend Performance)

### 5.1 Query Optimization 🗄️ **HIGH IMPACT**

```sql
-- Optimize frequent queries
CREATE INDEX CONCURRENTLY idx_movies_title_year ON movies(title, year);
CREATE INDEX CONCURRENTLY idx_analyses_query_hash ON movie_analyses(query_hash);

-- Materialized views for common aggregations
CREATE MATERIALIZED VIEW movie_stats AS
SELECT
  tmdb_id,
  analysis_count,
  avg_rating,
  last_updated
FROM movies
LEFT JOIN movie_analyses USING(movie_id);

REFRESH MATERIALIZED VIEW CONCURRENTLY movie_stats;
```

### 5.2 API Response Optimization 📡 **MEDIUM IMPACT**

```javascript
// Implement response compression and pagination
export default async function handler(req, res) {
  // Enable compression
  res.setHeader('Content-Encoding', 'gzip');

  // Pagination for large datasets
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const movies = await getMovies({ limit, offset });

  // Include cache headers
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  return res.json({
    movies,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: await getMovieCount(),
    },
  });
}
```

---

## 🔄 **Priority 6: Asset Reuse & Optimization** (Resource Efficiency)

### 6.1 Shared Component Library 🧱 **LOW-MEDIUM IMPACT**

```javascript
// lib/sharedComponents.js
export const reusableComponents = {
  MovieCard: memo(MovieCard),
  PersonCard: memo(PersonCard),
  LoadingSkeleton: memo(LoadingSkeleton),
};

// Implement component memoization
const MovieCard = memo(
  ({ movie }) => {
    return <div className="movie-card">{/* Component content */}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.movie.id === nextProps.movie.id;
  }
);
```

### 6.2 Icon & Asset Optimization 🎯 **LOW IMPACT**

```javascript
// Use icon sprites instead of individual files
import { Icon } from './IconSprite';

function Navigation() {
  return (
    <nav>
      <Icon name="home" />
      <Icon name="search" />
      <Icon name="favorites" />
    </nav>
  );
}
```

---

## 📈 **Implementation Timeline & Impact Matrix**

| Priority | Optimization          | Implementation Time | User Impact | Technical Effort |
| -------- | --------------------- | ------------------- | ----------- | ---------------- |
| 1        | Cache Strategy        | 1-2 days            | 🔥🔥🔥🔥🔥  | Medium           |
| 1        | Page-level ISR        | 1 day               | 🔥🔥🔥🔥    | Low              |
| 2        | Cloudflare CDN        | 2-3 hours           | 🔥🔥🔥🔥    | Low              |
| 2        | Static Assets         | 1 day               | 🔥🔥🔥      | Low              |
| 3        | Image Optimization    | 1-2 days            | 🔥🔥🔥      | Medium           |
| 3        | Lazy Loading          | 1 day               | 🔥🔥        | Low              |
| 4        | Code Splitting        | 2-3 days            | 🔥🔥        | Medium           |
| 4        | Critical CSS          | 1 day               | 🔥🔥        | Low              |
| 5        | Database Optimization | 2-3 days            | 🔥🔥🔥      | High             |
| 5        | API Optimization      | 1-2 days            | 🔥🔥        | Medium           |
| 6        | Component Reuse       | 2-3 days            | 🔥          | Low              |
| 6        | Asset Sprites         | 1 day               | 🔥          | Low              |

## 🎯 **Quick Wins (Week 1)**

1. **Cloudflare Setup** (2-3 hours) - Global performance boost
2. **Next.js ISR** (1 day) - Instant loading for popular movies
3. **Cache Headers** (2-3 hours) - Browser caching optimization
4. **Image Optimization** (1 day) - Faster visual loading

## 🚀 **Expected Results**

- **Before:** 5+ seconds average response time
- **After Phase 1:** <500ms for cached content, <2s for new content
- **After Full Implementation:** <300ms cached, <1s new content

## 📊 **Monitoring & Metrics**

```javascript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

**Key Metrics to Track:**

- First Contentful Paint (FCP) - Target: <1.8s
- Largest Contentful Paint (LCP) - Target: <2.5s
- Time to First Byte (TTFB) - Target: <600ms
- Cache Hit Rate - Target: >80%
- Claude API Response Time - Target: <3s

This plan prioritizes changes that will have the most immediate impact on user
perception while building toward a comprehensive performance optimization
strategy.
