// pages/api/admin/check-specific-tmdb-ids.js - Check specific TMDB IDs for slug data

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

const TMDB_IDS_TO_CHECK = [996, 678, 22112, 17218];

export default async function handler(req, res) {
  try {
    console.log('🔍 Checking specific TMDB IDs for slug data...');

    const results = [];

    for (const tmdbId of TMDB_IDS_TO_CHECK) {
      console.log(`Checking TMDB ID: ${tmdbId}`);
      
      const { data: movie, error } = await supabase
        .from('movies')
        .select('id, title, official_title, year, slug, poster_url, tmdb_id, created_at')
        .eq('tmdb_id', tmdbId)
        .single();
      
      let result = {
        tmdb_id: tmdbId,
        found: false,
        error: null,
        movie_data: null
      };

      if (error && !result) {
        result.error = 'Movie not found in database';
      } else if (error) {
        result.error = error.message;
      } else if (movie) {
        result.found = true;
        result.movie_data = {
          id: movie.id,
          title: movie.title,
          official_title: movie.official_title,
          year: movie.year,
          slug: movie.slug,
          slug_status: movie.slug ? (movie.slug.trim() === '' ? 'EMPTY_STRING' : 'HAS_VALUE') : 'NULL',
          created_at: movie.created_at,
          has_poster: !!movie.poster_url
        };
      }

      results.push(result);
      console.log(`TMDB ${tmdbId}: ${result.found ? 'FOUND' : 'NOT FOUND'} - ${result.found ? result.movie_data.slug_status : result.error}`);
    }

    const summary = {
      total_checked: TMDB_IDS_TO_CHECK.length,
      found_in_database: results.filter(r => r.found).length,
      not_found: results.filter(r => !r.found).length,
      with_slugs: results.filter(r => r.found && r.movie_data.slug && r.movie_data.slug.trim() !== '').length,
      without_slugs: results.filter(r => r.found && (!r.movie_data.slug || r.movie_data.slug.trim() === '')).length
    };

    const response = {
      summary,
      detailed_results: results,
      hypothesis_test: {
        question: "Do these movies have slugs in the database?",
        answer: summary.with_slugs > 0 ? 
          `Yes, ${summary.with_slugs} out of ${summary.found_in_database} found movies have slugs` : 
          `No, none of the ${summary.found_in_database} found movies have slugs`,
        conclusion: summary.with_slugs === 0 && summary.found_in_database > 0 ? 
          "Hypothesis CONFIRMED: Movies are missing slugs in the database" :
          summary.with_slugs > 0 ?
          "Hypothesis REJECTED: Movies do have slugs in the database" :
          "Hypothesis INCONCLUSIVE: Movies not found in database"
      }
    };

    console.log('📊 TMDB ID check results:', response);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ TMDB ID check failed:', error);
    return res.status(500).json({ 
      error: 'TMDB ID check failed', 
      details: error.message 
    });
  }
}