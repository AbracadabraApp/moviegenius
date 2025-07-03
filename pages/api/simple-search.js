// pages/api/simple-search.js - Ultra-simple movie search API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchQuery = query.trim();
    console.log(`🔍 Simple search: "${searchQuery}"`);

    // V1 Feature: Detect person searches (actor/director names)
    const isProbablyPerson = /^[A-Z][a-z]+ [A-Z][a-z]+( [A-Z][a-z]+)?$/.test(searchQuery) && 
                            !searchQuery.toLowerCase().includes('the ') &&
                            !searchQuery.toLowerCase().includes('and ') &&
                            searchQuery.split(' ').length <= 3;

    // V1 Smart Search: Multi-field search with ranking
    
    // Handle phrase matching with quotes
    const isPhrase = searchQuery.startsWith('"') && searchQuery.endsWith('"');
    const cleanQuery = isPhrase ? searchQuery.slice(1, -1) : searchQuery;
    
    // Search multiple fields with ranking
    let movies = [];
    
    if (isPhrase) {
      // Exact phrase matching - just search title for now (director/cast fields may not exist)
      const { data: exactMovies } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
        .ilike('title', `%${cleanQuery}%`)
        .order('year', { ascending: false })
        .limit(20);
      
      movies = exactMovies || [];
    } else {
      // Multi-field search with smart ranking
      // 1. Exact title matches (highest priority)
      const { data: exactTitles } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
        .ilike('title', cleanQuery)
        .limit(5);
      
      // 2. Title starts with query
      const { data: titleStarts } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
        .ilike('title', `${cleanQuery}%`)
        .not('title', 'ilike', cleanQuery) // Exclude exact matches
        .limit(8);
      
      // 3. Title contains query
      const { data: titleContains } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
        .ilike('title', `%${cleanQuery}%`)
        .not('title', 'ilike', cleanQuery)
        .not('title', 'ilike', `${cleanQuery}%`)
        .limit(7);
      
      // 4. Search in Claude analysis data for actors/directors 
      let analysisMatches = [];
      try {
        // Get movie analyses and search client-side (more reliable than complex JSON queries)
        const { data: analyses } = await supabase
          .from('movie_analyses')
          .select('movie_id, claude_response')
          .eq('analysis_type', 'page_analysis')
          .limit(200); // Reasonable subset to search through
        
        // Find analyses that mention the search term
        const matchingAnalyses = analyses?.filter(analysis => {
          const content = analysis.claude_response?.raw_content || '';
          return content.toLowerCase().includes(cleanQuery.toLowerCase());
        }) || [];
        
        let matchingMovieIds = [];
        
        if (isProbablyPerson) {
          // For person searches: only return movies where they actually star/direct
          // Look for stronger indicators like "starring", "directed by", "performance by"
          matchingMovieIds = matchingAnalyses
            .filter(analysis => {
              const content = analysis.claude_response?.raw_content || '';
              const lowerContent = content.toLowerCase();
              const lowerQuery = cleanQuery.toLowerCase();
              
              // Check for starring/directing keywords near the person's name
              const personIndex = lowerContent.indexOf(lowerQuery);
              if (personIndex === -1) return false;
              
              // Get text around the person's name (±100 chars)
              const contextStart = Math.max(0, personIndex - 100);
              const contextEnd = Math.min(content.length, personIndex + lowerQuery.length + 100);
              const context = lowerContent.substring(contextStart, contextEnd);
              
              // Look for filmography indicators
              return context.includes('starring') || 
                     context.includes('stars') ||
                     context.includes('directed by') ||
                     context.includes('director') ||
                     context.includes('performance') ||
                     context.includes('played') ||
                     context.includes('portrays') ||
                     context.includes('lead') ||
                     context.includes('cast');
            })
            .map(analysis => analysis.movie_id)
            .slice(0, 8); // More results for filmography
        } else {
          // For non-person searches: include all mentions
          matchingMovieIds = matchingAnalyses
            .map(analysis => analysis.movie_id)
            .slice(0, 5);
        }
        
        if (matchingMovieIds.length > 0) {
          // Get movie details for matching analyses
          const { data: movies } = await supabase
            .from('movies')
            .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
            .in('id', matchingMovieIds);
          
          analysisMatches = movies || [];
        }
      } catch (e) {
        console.log('Analysis search failed:', e.message);
      }
      
      // Combine and deduplicate by tmdb_id, maintaining ranking order
      const allMovies = [
        ...(exactTitles || []),
        ...(titleStarts || []),
        ...(titleContains || []),
        ...(analysisMatches || [])
      ];
      
      const seen = new Set();
      movies = allMovies.filter(movie => {
        // Only include movies with TMDB IDs and avoid duplicates
        if (!movie.tmdb_id) return false;
        if (seen.has(movie.tmdb_id)) return false;
        seen.add(movie.tmdb_id);
        return true;
      }).slice(0, 20);
    }

    console.log(`✅ Found ${movies.length} movies in database for "${searchQuery}"`);

    // If no results in database, try TMDB search as fallback
    if (!movies || movies.length === 0) {
      console.log(`🔍 No database results, searching TMDB for "${searchQuery}"`);
      try {
        const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
        const tmdbResults = await searchTMDB(searchQuery);
        
        if (tmdbResults && tmdbResults.length > 0) {
          // Convert TMDB results to our format
          movies = tmdbResults.slice(0, 10).map(movie => ({
            id: `tmdb_${movie.id}`, // Temporary ID for TMDB results
            title: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
            tmdb_id: movie.id,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/images/placeholder-poster.jpg',
            streaming_data: null,
            slug: null
          }));
          
          console.log(`🎬 Found ${movies.length} TMDB results for "${searchQuery}"`);
        }
      } catch (error) {
        console.error('TMDB search failed:', error);
      }
    }

    // V1 Feature: Provide fallback info for empty results
    const hasResults = movies && movies.length > 0;
    
    res.status(200).json({
      movies: movies || [],
      query: searchQuery,
      hasResults,
      fallback: !hasResults ? {
        message: "We didn't find a result, but would you like to pass it on to our Movie Genius?",
        askUrl: `/genius?q=${encodeURIComponent(searchQuery)}`
      } : null
    });

  } catch (error) {
    console.error('Simple search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
}