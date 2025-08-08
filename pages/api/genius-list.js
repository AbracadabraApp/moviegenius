import { getPool } from './railway-db.js';
import { createClient, supabase } from './railway-adapter.js';


// pages/api/genius-list.js
/**
 * Genius List API
 *
 * Fetches list data by ID and generates Claude description if needed.
 * Supports the unified genius template for both ask results and lists.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { id, metadata } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'List ID is required' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const pool = getPool();

    // Fetch list data
    const { data: list, error: listError } = await supabase
      .from('movie_lists')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!list) {
      return res.status(404).json({
        error: 'List not found',
        details: listError?.message,
      });
    }

    // If only metadata requested, return early
    if (metadata === 'true') {
      return res.status(200).json({
        list: {
          id: list.id,
          name: list.name,
          slug: list.slug,
          description: list.description,
        },
      });
    }

    // Check if we already have a cached Claude description
    let claudeDescription = null;
    const { data: existingAnalysis, error: analysisError } = await supabase
      .from('list_analyses')
      .select('claude_response')
      .eq('list_id', id)
      .eq('analysis_type', 'list_description')
      .single();

    if (existingAnalysis && !analysisError) {
      console.log(`Using cached description for list: ${list.name}`);
      claudeDescription = existingAnalysis.claude_response.raw_content;
    } else if (list.claude_prompt) {
      // Generate new Claude description
      console.log(`Generating new description for list: ${list.name}`);

      try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const systemPrompt = `Write a 30-50 word recommendation for this movie collection. 

Explain the discovery value - what unique films or perspectives users will find and why this collection matters. Write like a knowledgeable film programmer making a thoughtful recommendation, not a marketing pitch.

Avoid:
- Short exclamations or obvious questions
- "You'll discover!" or "Want to explore?" language  
- Carnival barker enthusiasm

Use:
- Confident, direct statements about what the collection offers
- Specific details about what makes it valuable
- Natural, conversational tone`;

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          temperature: 0.3,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [
            {
              role: 'user',
              content: list.claude_prompt,
            },
          ],
        });

        claudeDescription = message.content[0].text;

        // Calculate cost estimate
        const costEstimate =
          (message.usage.input_tokens * 3) / 1000000 + (message.usage.output_tokens * 15) / 1000000;

        // Save to database for caching
        const analysisData = {
          raw_content: claudeDescription,
          generated_at: new Date().toISOString(),
          cost_estimate: costEstimate,
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          model: 'claude-3-5-sonnet-20241022',
        };

        const { error: saveError } = await supabase.from('list_analyses').insert({
          list_id: id,
          analysis_type: 'list_description',
          claude_response: analysisData,
          query_text: `List description for ${list.name}`,
        });

        if (saveError) {
          console.error('Failed to save list analysis to database:', saveError);
          // Don't fail the request, just log the error
        } else {
          console.log(
            `Saved description for list ${list.name} - Cost: $${costEstimate.toFixed(4)}`
          );
        }
      } catch (claudeError) {
        console.error('Error generating Claude description:', claudeError);
        // Fall back to manual description
        claudeDescription = list.description;
      }
    } else {
      // No Claude prompt, use manual description
      claudeDescription = list.description;
    }

    // Fetch movies in this list from two sources:
    // 1. Traditional movie_list_items (manual curation)
    // 2. Movies mentioned in Claude analysis (auto-generated MediaCards)

    // Fetch manually curated movies
    const { data: listItems, error: itemsError } = await supabase
      .from('movie_list_items')
      .select(
        `
        movies (
          id,
          title,
          year,
          slug,
          poster_url,
          streaming_data,
          tmdb_id
        )
      `
      )
      .eq('list_id', id);

    let movies =
      listItems?.map(item => ({
        id: item.movies.id,
        title: item.movies.title,
        year: item.movies.year,
        slug: item.movies.slug,
        poster: item.movies.poster_url,
        streaming: item.movies.streaming_data,
        tmdb_id: item.movies.tmdb_id,
        source: 'curated',
      })) || [];

    // Fetch movies mentioned in Claude analysis (generated MediaCards)
    const { data: analysisData, error: analysisMovieError } = await supabase
      .from('list_analyses')
      .select('claude_response')
      .eq('list_id', id)
      .eq('analysis_type', 'list_description_and_movies')
      .single();

    if (analysisData && !analysisMovieError && analysisData.claude_response?.movies) {
      // For each movie mentioned in analysis, fetch from database if it exists
      const analysisMovies = [];
      for (const movieData of analysisData.claude_response.movies) {
        if (movieData.tmdb_id) {
          const { data: dbMovie, error: movieError } = await supabase
            .from('movies')
            .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
            .eq('tmdb_id', movieData.tmdb_id)
            .single();

          if (dbMovie && !movieError) {
            // Check if not already in curated list
            const existsInCurated = movies.some(m => m.tmdb_id === dbMovie.tmdb_id);
            if (!existsInCurated) {
              analysisMovies.push({
                id: dbMovie.id,
                title: dbMovie.title,
                year: dbMovie.year,
                slug: dbMovie.slug,
                poster: dbMovie.poster_url,
                streaming: dbMovie.streaming_data,
                tmdb_id: dbMovie.tmdb_id,
                source: 'analysis',
                rank: movieData.rank,
                reason: movieData.reason,
              });
            }
          }
        }
      }

      // Combine curated and analysis movies
      movies = [...movies, ...analysisMovies];
    }

    // Return unified data structure
    res.status(200).json({
      list: {
        id: list.id,
        name: list.name,
        slug: list.slug,
        description: list.description,
      },
      claudeDescription,
      movies,
      movieCount: movies.length,
      cached: existingAnalysis && !analysisError,
    });
  } catch (error) {
    console.error('Error in genius-list API:', error);
    res.status(500).json({
      error: 'Failed to fetch list data',
      details: error.message,
    });
  }
}
