// pages/api/list-analysis.js
/**
 * List Analysis API
 * 
 * Generates concise descriptions and curated movie collections using Claude.
 * Uses modular prompt system for consistent voice while maintaining brief format.
 * Focuses on curation context and ranked movie recommendations.
 * Now creates MediaCards for all mentioned movies using modern approach.
 */

/**
 * Create MediaCard for a movie (extracted from create-media-card.js)
 * Modern approach that mirrors ask-claude.js functionality
 */
async function createMediaCard({ title, year }) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { Anthropic } = await import('@anthropic-ai/sdk');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Step 1: Check if movie already exists in database
    const { data: existingMovie, error: checkError } = await supabase
      .from('movies')
      .select('id, tmdb_id, title, year, slug, poster_url')
      .ilike('title', title)
      .eq('year', year)
      .single();

    if (existingMovie && !checkError) {
      return {
        success: true,
        source: 'existing',
        movie: existingMovie
      };
    }

    // Step 2: Search TMDB for the movie
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
    );
    
    if (!tmdbResponse.ok) {
      throw new Error(`TMDB search failed: ${tmdbResponse.status}`);
    }
    
    const tmdbData = await tmdbResponse.json();
    const tmdbMovie = tmdbData.results?.[0];
    
    if (!tmdbMovie) {
      return {
        success: false,
        error: `Movie not found in TMDB: ${title} (${year})`
      };
    }

    // Step 3: Generate Claude slug for new movie
    let claudeSlug;
    try {
      const slugPrompt = `Create a compelling 30-character marketing tagline for "${tmdbMovie.title}" (${year}). Make it catchy and memorable, focusing on what makes this film special. Return only the tagline, no quotes.`;
      
      const slugMessage = await Promise.race([
        anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 50,
          messages: [{
            role: 'user',
            content: slugPrompt
          }]
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Claude slug timeout')), 10000)
        )
      ]);
      
      claudeSlug = slugMessage.content[0].text.trim().substring(0, 30);
    } catch (claudeError) {
      // No fallback slug - better to have null than fake content
      console.warn(`Claude slug generation failed for ${tmdbMovie.title}, saving without slug`);
      claudeSlug = null;
    }
    const movieYear = new Date(tmdbMovie.release_date).getFullYear();

    // Step 4: Save new movie to database
    const newMovie = {
      tmdb_id: tmdbMovie.id,
      title: tmdbMovie.title,
      year: movieYear,
      official_title: tmdbMovie.title,
      release_date: tmdbMovie.release_date || null,
      poster_url: tmdbMovie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : null,
      slug: claudeSlug,
      streaming_data: null,
      created_at: new Date().toISOString()
    };

    const { data: savedMovie, error: saveError } = await supabase
      .from('movies')
      .insert(newMovie)
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save movie to database: ${saveError.message}`);
    }

    return {
      success: true,
      source: 'created',
      movie: savedMovie
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { listId, listName, claudePrompt } = req.body;

  if (!listId || !listName || !claudePrompt) {
    return res.status(400).json({ error: 'List ID, name, and Claude prompt are required' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if we already have a cached analysis (try new format first, then fallback to old)
    let existingAnalysis = null;
    
    const { data: newFormatAnalysis, error: newError } = await supabase
      .from('list_analyses')
      .select('claude_response')
      .eq('list_id', listId)
      .eq('analysis_type', 'list_description_and_movies')
      .single();

    if (newFormatAnalysis && !newError) {
      existingAnalysis = newFormatAnalysis;
    } else {
      // Fallback to old format
      const { data: oldFormatAnalysis, error: oldError } = await supabase
        .from('list_analyses')
        .select('claude_response')
        .eq('list_id', listId)
        .eq('analysis_type', 'list_description')
        .single();
      
      if (oldFormatAnalysis && !oldError) {
        existingAnalysis = oldFormatAnalysis;
      }
    }

    if (existingAnalysis) {
      console.log(`Using cached analysis for list: ${listName}`);
      const responseData = existingAnalysis.claude_response;
      
      return res.status(200).json({
        description: responseData.description || responseData.raw_content,
        movies: responseData.movies || [],
        movieCount: responseData.movies ? responseData.movies.length : 0,
        listName: listName,
        cached: true
      });
    }

    // Generate new analysis with Claude using modular prompt system
    console.log(`Generating new analysis for list: ${listName}`);
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { buildPrompt } = await import('../../lib/prompts/builder.js');
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use modular prompt system for LIST context (concise collection descriptions)
    const promptConfig = buildPrompt('LIST', 'Generate concise collection description and curated movie list (15-25 films). Keep descriptions brief and focused on curation context.');

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: claudePrompt
        }
      ]
    });

    const rawResponse = message.content[0].text;
    
    // Parse the response to extract description and movies
    const descriptionMatch = rawResponse.match(/DESCRIPTION:\s*(.*?)(?=\nMOVIES:|$)/s);
    const moviesMatch = rawResponse.match(/MOVIES:\s*(.*)/s);
    
    const description = descriptionMatch ? descriptionMatch[1].trim() : rawResponse;
    const moviesSection = moviesMatch ? moviesMatch[1].trim() : '';
    
    // Parse movies into structured format and create MediaCards
    const movies = [];
    if (moviesSection) {
      const movieLines = moviesSection.split('\n').filter(line => line.trim());
      
      for (const [index, line] of movieLines.entries()) {
        const parts = line.split('|');
        if (parts.length >= 2) {
          const movieData = {
            rank: index + 1,
            title: parts[0].trim(),
            year: parts[1].trim(),
            reason: parts[2] ? parts[2].trim() : '',
            raw_line: line.trim()
          };
          
          // Create MediaCard using modern approach (similar to ask-claude.js)
          try {
            const mediaCardResult = await createMediaCard({
              title: movieData.title,
              year: parseInt(movieData.year) || new Date().getFullYear()
            });
            
            if (mediaCardResult.success) {
              console.log(`✅ Created MediaCard for ${movieData.title} (${movieData.year}) from list analysis`);
              
              // Enhance movie data with MediaCard info
              movieData.tmdb_id = mediaCardResult.movie?.tmdb_id;
              movieData.poster_url = mediaCardResult.movie?.poster_url;
              movieData.slug = mediaCardResult.movie?.slug;
              
              // Only add movies that were successfully created with full data
              movies.push(movieData);
            } else {
              console.log(`⚠️ Failed to create MediaCard for ${movieData.title} (${movieData.year}):`, mediaCardResult.error);
              // Don't add failed movies to prevent null slug entries
            }
          } catch (error) {
            console.error(`❌ Error creating MediaCard for ${movieData.title}:`, error.message);
            // Don't add errored movies to prevent incomplete data
          }
        }
      }
    }
    
    // Calculate cost estimate (rough)
    const costEstimate = (message.usage.input_tokens * 3 / 1000000) + (message.usage.output_tokens * 15 / 1000000);
    
    // Save to database
    const analysisData = {
      raw_content: rawResponse,
      description: description,
      movies: movies,
      generated_at: new Date().toISOString(),
      cost_estimate: costEstimate,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      model: promptConfig.model // Use configurable model from prompt system
    };

    const { error: saveError } = await supabase
      .from('list_analyses')
      .insert({
        list_id: listId,
        analysis_type: 'list_description_and_movies',
        claude_response: analysisData,
        query_text: `Combined description and movie curation for ${listName}`
      });

    if (saveError) {
      console.error('Failed to save list analysis to database:', saveError);
      // Don't fail the request, just log the error
    } else {
      console.log(`Saved combined analysis for list ${listName} - ${movies.length} movies - Cost: $${costEstimate.toFixed(4)}`);
    }

    res.status(200).json({ 
      description: description,
      movies: movies,
      movieCount: movies.length,
      listName: listName,
      cached: false,
      cost: costEstimate
    });

  } catch (error) {
    console.error('Error generating list analysis:', error);
    res.status(500).json({ 
      error: 'Failed to generate list analysis',
      analysis: `${listName} is a thoughtfully curated collection of films that showcases the breadth and depth of cinema. This selection brings together exceptional works that demonstrate the power of filmmaking to entertain, challenge, and inspire audiences across generations.`
    });
  }
}