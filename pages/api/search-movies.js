// pages/api/search-movies.js - Movie search API endpoint
import { createClient } from '@supabase/supabase-js';
import { createBulkRequests } from './tmdb-bulk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { query, limit = 20, filters = {} } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchQuery = query.trim();
    if (searchQuery.length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }

    console.log(`🔍 Movie search: "${searchQuery}" (limit: ${limit})`);

    // Build search query with filters
    let dbQuery = supabase
      .from('movies')
      .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
      .limit(Math.min(limit, 50)); // Cap at 50 results

    // Multi-strategy search approach
    const searchStrategies = [];

    // Strategy 1: Exact title match (highest priority)
    searchStrategies.push(
      dbQuery
        .ilike('title', searchQuery)
        .order('year', { ascending: false })
    );

    // Strategy 2: Title starts with query
    if (searchQuery.length >= 3) {
      searchStrategies.push(
        dbQuery
          .ilike('title', `${searchQuery}%`)
          .order('year', { ascending: false })
      );
    }

    // Strategy 3: Fuzzy title search using trigram similarity
    searchStrategies.push(
      dbQuery
        .textSearch('title', searchQuery, { type: 'websearch' })
        .order('year', { ascending: false })
    );

    // Strategy 4: Title contains query (lowest priority)
    searchStrategies.push(
      dbQuery
        .ilike('title', `%${searchQuery}%`)
        .order('year', { ascending: false })
    );

    // Apply filters if specified
    if (filters.yearRange) {
      searchStrategies.forEach(strategy => {
        if (filters.yearRange.min) strategy.gte('year', filters.yearRange.min);
        if (filters.yearRange.max) strategy.lte('year', filters.yearRange.max);
      });
    }

    // Note: Genre and streaming filters would require additional database schema
    // For now, we'll implement client-side filtering as a proof of concept

    // Execute searches in parallel
    const searchPromises = searchStrategies.map(async (strategy, index) => {
      try {
        const { data, error } = await strategy;
        if (error) throw error;
        return { data: data || [], strategy: index };
      } catch (error) {
        console.warn(`Search strategy ${index} failed:`, error);
        return { data: [], strategy: index };
      }
    });

    const searchResults = await Promise.allSettled(searchPromises);
    
    // Combine and deduplicate results, prioritizing by strategy order
    const movieMap = new Map();
    const resultsByStrategy = [];

    searchResults.forEach((result, strategyIndex) => {
      if (result.status === 'fulfilled') {
        const movies = result.value.data;
        resultsByStrategy[strategyIndex] = movies.length;
        
        movies.forEach(movie => {
          if (!movieMap.has(movie.tmdb_id || movie.id)) {
            movieMap.set(movie.tmdb_id || movie.id, {
              ...movie,
              searchScore: 100 - strategyIndex * 10 // Higher score for earlier strategies
            });
          }
        });
      }
    });

    let movies = Array.from(movieMap.values())
      .sort((a, b) => {
        // Sort by search score, then by year (newer first)
        if (a.searchScore !== b.searchScore) {
          return b.searchScore - a.searchScore;
        }
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, limit);

    // If we have few results, try TMDB search as fallback
    if (movies.length < 5 && searchQuery.length >= 3) {
      try {
        console.log(`🎬 TMDB fallback search for: "${searchQuery}"`);
        
        const tmdbResponse = await fetch('/api/tmdb-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              id: 'search_fallback',
              type: 'search_movie',
              params: { title: searchQuery, year: null }
            }]
          })
        });

        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          const tmdbResult = tmdbData.results?.[0];
          
          if (tmdbResult?.success && tmdbResult.data) {
            const tmdbMovie = tmdbResult.data;
            
            // Check if we already have this movie
            const exists = movies.some(m => m.tmdb_id === tmdbMovie.tmdb_id);
            
            if (!exists) {
              // Add TMDB result with lower search score
              movies.push({
                ...tmdbMovie,
                id: tmdbMovie.tmdb_id,
                poster_url: tmdbMovie.poster,
                streaming_data: null,
                slug: null,
                searchScore: 50 // Lower score for TMDB fallback
              });
              
              console.log(`✅ Added TMDB fallback: ${tmdbMovie.title} (${tmdbMovie.year})`);
            }
          }
        }
      } catch (tmdbError) {
        console.warn('TMDB fallback failed:', tmdbError);
      }
    }

    const searchTime = Date.now() - startTime;
    
    console.log(`🔍 Search completed in ${searchTime}ms: ${movies.length} results`);
    console.log(`📊 Strategy results: ${resultsByStrategy.map((count, i) => `S${i}: ${count || 0}`).join(', ')}`);

    // Return results
    res.status(200).json({
      movies: movies.map(movie => ({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id,
        poster_url: movie.poster_url || movie.poster,
        streaming_data: movie.streaming_data,
        slug: movie.slug
      })),
      query: searchQuery,
      total: movies.length,
      searchTime,
      strategies: resultsByStrategy,
      hasMore: movieMap.size > limit
    });

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error('Movie search error:', error);
    
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      searchTime
    });
  }
}

// Helper function to clean and normalize search terms
function normalizeSearchTerm(term) {
  return term
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to extract year from query if present
function extractYearFromQuery(query) {
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    const cleanQuery = query.replace(yearMatch[0], '').replace(/\s+/g, ' ').trim();
    return { query: cleanQuery, year };
  }
  return { query, year: null };
}