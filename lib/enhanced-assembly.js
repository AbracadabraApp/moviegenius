/**
 * Enhanced Movie Assembly Function
 *
 * Assembles complete enhanced movie data from multiple database sources:
 * 1. Read from correct database sources
 * 2. Process movie title linking
 * 3. Assemble into enhanced static format
 * 4. Validate output structure and content
 */

import { Pool } from 'pg';
import { getMovieContributors } from './services/contributors-service.js';
import { processAnalysisContent } from './movie-analysis-linker.js';

let globalPool = null;

/**
 * Get or create the global database pool
 */
function getPool() {
  if (!globalPool) {
    globalPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  return globalPool;
}

/**
 * Assemble enhanced movie data for static file generation
 * @param {number} tmdbId - TMDB ID of the movie
 * @param {Pool} externalPool - Optional external database pool to use
 * @returns {Object} Enhanced movie data in static format
 */
export async function assembleEnhancedMovieData(tmdbId, externalPool = null) {
  const pool = externalPool || getPool();
  const client = await pool.connect();

  try {
    // 1. Get base movie data
    const movieResult = await client.query(`
      SELECT id, tmdb_id, title, year, poster_url, streaming_data, trailer_url
      FROM movies
      WHERE tmdb_id = $1
    `, [tmdbId]);

    if (movieResult.rows.length === 0) {
      throw new Error(`Movie with TMDB ID ${tmdbId} not found`);
    }

    const movie = movieResult.rows[0];

    // 2. Get enhanced analysis data (NOT from claude_response.raw_content)
    const analysisResult = await client.query(`
      SELECT
        enhanced_sections::text as sections,
        enhanced_key_elements::text as key_elements
      FROM movie_analyses
      WHERE movie_id = $1
      AND analysis_type = 'general'
      AND enhanced_format = true
    `, [movie.id]);

    if (analysisResult.rows.length === 0) {
      throw new Error(`No enhanced analysis found for movie ${movie.title}`);
    }

    const analysisData = analysisResult.rows[0];
    const sections = JSON.parse(analysisData.sections);
    const keyElements = analysisData.key_elements ? JSON.parse(analysisData.key_elements) : {};

    // 3. Get Contributors data first (needed for person linking)
    let contributors = null;
    try {
      contributors = await getMovieContributors(movie.id, tmdbId);
    } catch (error) {
      console.warn(`Contributors error for ${movie.title}:`, error.message);
    }

    // 4. Process movie title linking and person linking in sections
    const processedSections = [];
    for (const section of sections) {
      if (section.text) {
        // Convert contributors to the format expected by movie-analysis-linker
        const contributorsList = [];
        if (contributors) {
          if (contributors.director) contributorsList.push({ name: contributors.director.name, role: 'director' });
          if (contributors.writers) contributors.writers.forEach(w => contributorsList.push({ name: w.name, role: 'writer' }));
          if (contributors.stars) contributors.stars.forEach(s => contributorsList.push({ name: s.name, role: 'star' }));
          if (contributors.cinematographer) contributorsList.push({ name: contributors.cinematographer.name, role: 'cinematographer' });
          if (contributors.composer) contributorsList.push({ name: contributors.composer.name, role: 'composer' });
        }

        const processedText = await processAnalysisContent(
          section.text,
          movie.title,
          `${movie.title} section`,
          '', // No raw content needed since we're passing contributors directly
          {
            dbClient: client,
            contributors: contributorsList // Pass contributors directly
          }
        );
        processedSections.push({
          ...section,
          text: processedText
        });
      } else {
        processedSections.push(section);
      }
    }

    // 5. Get Why Watch data
    const whyWatchResult = await client.query(`
      SELECT recommendation, reasons
      FROM enhanced_why_watch
      WHERE tmdb_id = $1
    `, [tmdbId]);

    const whyWatch = whyWatchResult.rows.length > 0
      ? whyWatchResult.rows[0]
      : { recommendation: 'NO', reasons: [] };

    // 6. Get More Ideas data
    const moreIdeasResult = await client.query(`
      SELECT ideas
      FROM more_ideas
      WHERE tmdb_id = $1
    `, [tmdbId]);

    const moreIdeas = moreIdeasResult.rows.length > 0
      ? moreIdeasResult.rows[0].ideas
      : [];

    // 7. Assemble enhanced static format
    const enhancedData = {
      // Core movie identification
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,

      // Movie header data
      movieHeader: {
        title: movie.title,
        year: movie.year,
        posterUrl: movie.poster_url || `https://image.tmdb.org/t/p/w500/placeholder.jpg`,
        trailerVideoId: movie.trailer_url || null,
        streaming: movie.streaming_data || null,
        overview: `${movie.title} (${movie.year})` // Basic overview
      },

      // Analysis content
      analysis: {
        keyElements: keyElements,
        sections: processedSections,
        whyWatch: whyWatch,
        featuredMovies: [], // TODO: Extract from analysis or generate
        moreIdeas: moreIdeas,
        exploreTopics: [] // TODO: Extract from keyElements or generate
      },

      // Contributors data for footer
      keyElements: contributors || {},

      // Metadata
      enhancedFormat: true,
      staticGenerated: true,
      lastUpdated: new Date().toISOString(),
      buildData: {
        posterValidated: !!movie.poster_url,
        streamingCurrent: !!movie.streaming_data,
        trailerResolved: !!movie.trailer_url,
        linksProcessed: true
      }
    };

    return enhancedData;

  } finally {
    client.release();
  }
}

/**
 * Close the database pool (for cleanup in scripts)
 */
export async function closePool() {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
  }
}