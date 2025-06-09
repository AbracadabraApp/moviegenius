/**
 * Test Movies Batch (Hardcoded Token)
 * 
 * Temporary endpoint with hardcoded token to bypass Railway env var issues
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


// Hardcoded token for testing
const HARDCODED_TOKEN = 'af11d17accf20f960371d02711327582e579014e44d0d842b72e9d0971ddb978';

class TestMovieBatchProcessor {
  constructor() {
    this.maxBatchSize = 10; // Smaller batch for testing
  }

  async findMoviesMissingAnalysis(limit = 10) {
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

      // For testing, just return the movies that would be processed
      return {
        success: true,
        movies_found: movies.length,
        sample_movies: movies.slice(0, 3).map(m => ({
          title: m.title,
          year: m.year
        })),
        message: `Found ${movies.length} movies ready for analysis`,
        note: 'This is a test endpoint - no actual batch created'
      };
    } catch (error) {
      console.error('Test batch processing failed:', error);
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

  // Check hardcoded token
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${HARDCODED_TOKEN}`) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      debug: {
        received: authHeader || 'none',
        expected: `Bearer ${HARDCODED_TOKEN}`
      }
    });
  }

  try {
    const processor = new TestMovieBatchProcessor();
    const result = await processor.processBatch();

    console.log('Test movie batch result:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Test movie batch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}