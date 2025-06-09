/**
 * Railway Batch Processing API - Movies
 * 
 * Endpoint for automated movie analysis batch processing
 * Designed to run on Railway cron jobs
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class RailwayMovieBatchProcessor {
  constructor() {
    this.maxBatchSize = 200; // Accelerated: Process up to 200 movies per run for 80% coverage in 3-4 days
    this.systemPrompt = `You are a film expert providing thorough, professional analysis. You have encyclopedic knowledge of films from all eras and countries.

Guidelines:
- Professional tone, informative but not pedantic
- Mention specific directors, cinematographers, actors when relevant
- Structure as alternating paragraphs and movie mentions
- ONLY include movie cards for films specifically mentioned by title in each paragraph
- If a paragraph mentions no specific film titles, include no MOVIES lines for that paragraph
- End with extensive "More Ideas" list containing up to 50 relevant movies
- Write detailed, comprehensive responses with precise movie-to-paragraph matching

Format your response exactly as:
PARAGRAPH: [film analysis paragraph mentioning specific movie titles]
MOVIES: title1|year1|description1|streaming1
MOVIES: title2|year2|description2|streaming2
PARAGRAPH: [another paragraph - if no movies mentioned by title, no MOVIES lines follow]
PARAGRAPH: [paragraph mentioning one specific title]
MOVIES: title3|year3|description3|streaming3
MORE_IDEAS: title4|year4|description4|streaming4
MORE_IDEAS: title5|year5|description5|streaming5`;
  }

  async findMoviesMissingAnalysis(limit = 100) {
    try {
      const allMoviesWithoutAnalysis = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore && allMoviesWithoutAnalysis.length < limit) {
        const { data: movies, error } = await supabase
          .from('movies')
          .select('id, title, year, tmdb_id')
          .order('title')
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (!movies || movies.length === 0) break;

        // Check which movies have analysis
        const movieIds = movies.map(m => m.id);
        const { data: analyses } = await supabase
          .from('movie_analyses')
          .select('movie_id')
          .in('movie_id', movieIds);

        const analyzedIds = new Set(analyses?.map(a => a.movie_id) || []);
        const missingAnalysis = movies.filter(m => !analyzedIds.has(m.id));
        
        allMoviesWithoutAnalysis.push(...missingAnalysis);
        offset += batchSize;
        hasMore = movies.length === batchSize;
      }

      return allMoviesWithoutAnalysis.slice(0, limit);
    } catch (error) {
      console.error('Error finding movies missing analysis:', error);
      throw error;
    }
  }

  async createBatch(movies) {
    const requests = movies.map(movie => ({
      custom_id: movie.id,
      params: {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        system: [
          {
            type: "text",
            text: this.systemPrompt,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [{
          role: 'user',
          content: `${movie.title} (${movie.year})`
        }]
      }
    }));

    try {
      const batch = await anthropic.beta.messages.batches.create({
        requests: requests
      });

      // Store batch info in database
      await supabase
        .from('batch_jobs')
        .insert({
          batch_id: batch.id,
          type: 'movie_analysis',
          status: batch.processing_status,
          movie_count: movies.length,
          movie_ids: movies.map(m => m.id),
          created_at: new Date().toISOString()
        });

      return batch;
    } catch (error) {
      console.error('Error creating batch:', error);
      throw error;
    }
  }

  async processBatch() {
    try {
      const movies = await this.findMoviesMissingAnalysis(this.maxBatchSize);
      
      if (movies.length === 0) {
        return {
          success: true,
          message: 'No movies needing analysis',
          processed: 0
        };
      }

      const batch = await this.createBatch(movies);

      return {
        success: true,
        batch_id: batch.id,
        status: batch.processing_status,
        movies_queued: movies.length,
        estimated_cost: (movies.length * 0.01).toFixed(2),
        message: `Batch created with ${movies.length} movies`
      };
    } catch (error) {
      console.error('Batch processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Railway cron job auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_BATCH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const processor = new RailwayMovieBatchProcessor();
    const result = await processor.processBatch();

    // Log the result
    console.log('Movie batch processing result:', result);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Movie batch processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}