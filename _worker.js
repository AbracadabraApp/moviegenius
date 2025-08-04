// Cloudflare Worker for MovieGenius Performance Optimization
// Handles edge-side caching, compression, and routing optimization

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, search } = url;

    // Skip worker for certain paths
    if (pathname.startsWith('/api/') && !shouldOptimizeAPI(pathname)) {
      return fetch(request);
    }

    try {
      // Homepage Redirect - Handle before any caching
      if (pathname === '/') {
        return Response.redirect(new URL('/recs', request.url), 301);
      }

      // Static Assets - Cache for 1 year
      if (isStaticAsset(pathname)) {
        return handleStaticAsset(request, ctx);
      }

      // TMDB Images - Optimize and cache
      if (pathname.startsWith('/api/tmdb-poster') || pathname.includes('image.tmdb.org')) {
        return handleTMDBImage(request, ctx);
      }

      // Movie Pages - Edge cache with smart invalidation
      if (pathname.startsWith('/movie/')) {
        return handleMoviePage(request, ctx);
      }

      // API Routes - Intelligent caching
      if (pathname.startsWith('/api/')) {
        return handleAPIRoute(request, ctx);
      }

      // General page handling
      return handleGeneralPage(request, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return fetch(request); // Fallback to origin
    }
  },
};

// Static Asset Optimization
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/images/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  );
}

async function handleStaticAsset(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  // Check cache first
  let response = await cache.match(cacheKey);

  if (!response) {
    // Fetch from origin
    response = await fetch(request);

    if (response.ok) {
      // Clone response to cache
      const cacheResponse = response.clone();

      // Set long cache headers
      const headers = new Headers(cacheResponse.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Cache', 'MISS');

      const cachedResponse = new Response(cacheResponse.body, {
        status: cacheResponse.status,
        statusText: cacheResponse.statusText,
        headers,
      });

      // Cache for 1 year
      ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
      return cachedResponse;
    }
  } else {
    // Add cache hit header
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}

// TMDB Image Optimization
async function handleTMDBImage(request, ctx) {
  const cache = caches.default;
  const url = new URL(request.url);

  // Add WebP optimization for supporting browsers
  const acceptHeader = request.headers.get('Accept') || '';
  const supportsWebP = acceptHeader.includes('image/webp');
  const supportsAVIF = acceptHeader.includes('image/avif');

  let cacheKey = request.url;
  if (supportsAVIF) cacheKey += '?avif=1';
  else if (supportsWebP) cacheKey += '?webp=1';

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const headers = new Headers(cachedResponse.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers,
    });
  }

  // Fetch and optimize image
  const response = await fetch(request);

  if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('X-Cache', 'MISS');

    const optimizedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // Cache the optimized image
    ctx.waitUntil(cache.put(cacheKey, optimizedResponse.clone()));
    return optimizedResponse;
  }

  return response;
}

// Movie Page Optimization
async function handleMoviePage(request, ctx) {
  const cache = caches.default;
  const url = new URL(request.url);

  // Extract movie ID for intelligent caching
  const movieId = url.pathname.split('/')[2];
  const cacheKey = `movie-page-${movieId}`;

  // Check for cached version
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const cacheAge =
      Date.now() - new Date(cachedResponse.headers.get('cf-cached-at') || 0).getTime();

    // Serve cached version if less than 1 hour old
    if (cacheAge < 3600000) {
      // 1 hour
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache', 'HIT');
      headers.set('X-Cache-Age', Math.floor(cacheAge / 1000).toString());
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }
  }

  // Fetch fresh version
  const response = await fetch(request);

  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    headers.set('X-Cache', 'MISS');
    headers.set('cf-cached-at', new Date().toISOString());

    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // Cache for 1 hour
    ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
    return cachedResponse;
  }

  return response;
}

// API Route Optimization
function shouldOptimizeAPI(pathname) {
  const optimizableAPIs = [
    '/api/movie-analysis',
    '/api/person-analysis',
    '/api/list-analysis',
    '/api/tag-cloud',
    '/api/tmdb-poster',
  ];
  return optimizableAPIs.some(api => pathname.startsWith(api));
}

async function handleAPIRoute(request, ctx) {
  const cache = caches.default;
  const url = new URL(request.url);

  // Only cache GET requests
  if (request.method !== 'GET') {
    return fetch(request);
  }

  // Create cache key based on full URL
  const cacheKey = request.url;

  // Check cache
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const headers = new Headers(cachedResponse.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers,
    });
  }

  // Fetch from origin
  const response = await fetch(request);

  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'MISS');

    // Set appropriate cache duration based on API
    if (url.pathname.includes('movie-analysis')) {
      headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    } else if (url.pathname.includes('tag-cloud')) {
      headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    } else {
      headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    }

    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // Cache the response
    ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
    return cachedResponse;
  }

  return response;
}

// General Page Handling
async function handleGeneralPage(request, ctx) {
  const response = await fetch(request);

  if (response.ok) {
    const headers = new Headers(response.headers);

    // Add performance headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');

    // Basic caching for HTML pages
    if (response.headers.get('content-type')?.includes('text/html')) {
      headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}
