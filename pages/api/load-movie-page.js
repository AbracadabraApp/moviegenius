// pages/api/load-movie-page.js
/**
 * Load Movie Page API
 *
 * Handles movie page loading with all required data:
 * - Ensures movie has TMDB data and slug (calls create-media-card if needed)
 * - Generates Claude analysis if missing
 * - Creates "Explore Further" topics
 * - Handles "More Ideas" section
 *
 * Real-world: MediaCards drive traffic to movie pages, so TMDB/slug usually exists
 * Clean slate: May need to fetch TMDB data for placeholder movies
 *
 * Process:
 * 1. Load movie from database
 * 2. Ensure complete MediaCard data (TMDB + slug)
 * 3. Generate analysis if missing
 * 4. Save analysis with explore further topics
 * 5. Return complete movie page data
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../../lib/prompts/builder.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Extract movie titles and years from Claude's analysis text
 * Handles multiple formats Claude uses to mention movies
 */
function extractMoviesFromAnalysis(text) {
  if (!text || typeof text !== 'string') return [];

  const movies = new Set();

  // Regex patterns to match different movie mention formats
  const patterns = [
    // MOVIES: Movie Title|Year|Description|Streaming format
    /MOVIES:\s*([^|]+)\|(\d{4})\|[^|]*\|[^\n]*/g,
    // MORE_IDEAS: Movie Title|Year|Description|Streaming format
    /MORE_IDEAS:\s*([^|]+)\|(\d{4})\|[^|]*\|[^\n]*/g,
    // "Movie Title" (Year) format
    /"([^"]+)"\s*\((\d{4})\)/g,
    // **Movie Title** (Year) format
    /\*\*([^*]+)\*\*\s*\((\d{4})\)/g,
    // Movie Title (Year) at start of sentence
    /(?:^|\. )([A-Z][^.!?]*?)\s*\((\d{4})\)/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1].trim();
      const year = parseInt(match[2]);

      // Basic validation
      if (
        title.length > 2 &&
        title.length < 100 &&
        year >= 1900 &&
        year <= new Date().getFullYear() + 2 &&
        !title.includes('@') &&
        !title.includes('http')
      ) {
        movies.add(JSON.stringify({ title, year }));
      }
    }
  });

  // Convert back to objects
  return Array.from(movies).map(json => JSON.parse(json));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { tmdb_id } = req.body;

  if (!tmdb_id) {
    return res.status(400).json({ error: 'TMDB ID is required' });
  }

  try {
    // Loading movie page

    // Step 1: Load movie from database
    const { data: movieData, error: movieError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdb_id)
      .single();

    let movie = movieData;

    if (movieError || !movie) {
      // Movie not found, creating from TMDB

      // Try to create the movie via create-media-card API
      try {
        const mediaCardResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-media-card`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tmdb_id: tmdb_id }),
          }
        );

        if (mediaCardResponse.ok) {
          const mediaCardData = await mediaCardResponse.json();
          // Created movie from TMDB

          // Use the newly created movie data
          movie = mediaCardData.movie;
        } else {
          console.error('❌ Failed to create movie from TMDB:', mediaCardResponse.status);
          return res.status(404).json({ error: 'Movie not found in TMDB' });
        }
      } catch (createError) {
        console.error('❌ Error creating movie from TMDB:', createError);
        return res.status(404).json({ error: 'Failed to load movie from TMDB' });
      }
    }

    // Found movie

    // Step 2: Ensure complete MediaCard data (TMDB + slug)
    let completeMovie = movie;

    // Check if movie has placeholder data
    if (movie.title === 'TMDB_FETCH_REQUIRED' || !movie.slug || movie.slug.startsWith('tmdb-')) {
      // Movie needs TMDB data, calling create-media-card

      // Call our MediaCard creation API to populate TMDB data
      const mediaCardResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-media-card`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: movie.tmdb_id }),
        }
      );

      if (mediaCardResponse.ok) {
        const mediaCardData = await mediaCardResponse.json();
        completeMovie = mediaCardData.movie;
        // MediaCard data updated
      } else {
        // MediaCard update failed, proceeding with existing data
      }
    }

    // Step 3: Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('movie_analyses')
      .select('claude_response')
      .eq('movie_id', completeMovie.id)
      .eq('analysis_type', 'page_analysis')
      .single();

    if (existingAnalysis) {
      // Using cached analysis

      // Cache for 7 days since analysis is stable
      res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=1209600');

      return res.status(200).json({
        success: true,
        movie: completeMovie,
        analysis: existingAnalysis.claude_response.raw_content,
        entityData: existingAnalysis.claude_response.entity_data?.entities || null,
        cached: true,
      });
    }

    // Step 4: Generate new analysis
    // Generating new analysis

    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-4 accessibly written Explore Further topics for additional explorations'
    );
    const userPrompt = `${completeMovie.title} (${completeMovie.year})`;

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const analysis = message.content[0].text;

    // Step 5: Run Related Movie Discovery
    let entityData = null;
    let newMoviesCreated = 0;

    try {
      // Running Related Movie Discovery

      // Extract movie mentions from Claude's analysis
      const movieMentions = extractMoviesFromAnalysis(analysis);
      // Found movie mentions in analysis

      // Create MediaCards for any movies that don't exist in database
      for (const movieMention of movieMentions) {
        try {
          const createResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-media-card`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: movieMention.title,
                year: movieMention.year,
              }),
            }
          );

          if (createResponse.ok) {
            const createData = await createResponse.json();
            if (createData.source === 'created') {
              newMoviesCreated++;
              // Created MediaCard
            }
          }
        } catch (movieError) {
          console.warn(
            `⚠️ Failed to create MediaCard for ${movieMention.title}:`,
            movieError.message
          );
        }
      }

      // Related Movie Discovery completed

      // Set minimal entity data for compatibility
      entityData = {
        people: [],
        movies: movieMentions,
        stats: { newMoviesCreated },
      };
    } catch (discoveryError) {
      console.warn('⚠️ Related Movie Discovery failed:', discoveryError.message);
    }

    // Calculate cost estimate
    const costEstimate =
      (message.usage.input_tokens * 3) / 1000000 + (message.usage.output_tokens * 15) / 1000000;

    // Step 6: Save analysis to database
    const analysisData = {
      raw_content: analysis,
      generated_at: new Date().toISOString(),
      cost_estimate: costEstimate,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      model: promptConfig.model,
      entity_data: entityData ? { entities: entityData } : null,
    };

    const { error: saveError } = await supabase.from('movie_analyses').insert({
      movie_id: completeMovie.id,
      analysis_type: 'page_analysis',
      claude_response: analysisData,
      query_text: `Movie page analysis for ${completeMovie.title} (${completeMovie.year})`,
    });

    if (saveError) {
      console.error('❌ Failed to save analysis:', saveError);
    } else {
      // Saved analysis
    }

    // Cache newly generated content for 7 days
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=1209600');

    res.status(200).json({
      success: true,
      movie: completeMovie,
      analysis: analysis,
      entityData: entityData,
      cost: costEstimate,
      cached: false,
    });
  } catch (error) {
    console.error('❌ Movie page loading failed:', error);
    res.status(500).json({
      error: 'Failed to load movie page',
      details: error.message,
    });
  }
}
