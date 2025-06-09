/**
 * Railway Batch Processing API - Slugs
 * 
 * Endpoint for backfilling missing movie slugs in production
 * Generates concise descriptions for MediaCard display
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

class RailwaySlugBatchProcessor {
  constructor() {
    this.maxBatchSize = 50; // Process up to 50 movies per run
    this.delay = 500; // 500ms between requests
  }

  async findMoviesMissingSlug() {
    try {
      let allMissingMovies = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('movies')
          .select('id, title, year, slug')
          .order('title')
          .range(offset, offset + batchSize - 1);
        
        if (error) throw new Error(`Query failed: ${error.message}`);
        
        if (batch && batch.length > 0) {
          const missingInBatch = batch.filter(movie => 
            movie.slug === null || 
            movie.slug === '' || 
            (movie.slug && movie.slug.trim() === '')
          );
          
          allMissingMovies = allMissingMovies.concat(missingInBatch);
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      return allMissingMovies.slice(0, this.maxBatchSize);
    } catch (error) {
      console.error('Error finding movies missing slugs:', error);
      throw error;
    }
  }

  async generateSlug(title, year) {
    const prompt = `For the movie "${title}" (${year}), provide a brief, compelling one-sentence description that captures the essence of the film. Keep it under 50 characters and focus on the main plot or what makes it memorable. Just return the description, nothing else.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      let slug = message.content[0].text.trim();
      
      // Remove quotes if Claude added them
      if (slug.startsWith('"') && slug.endsWith('"')) {
        slug = slug.slice(1, -1);
      }
      
      return slug;
    } catch (error) {
      console.error(`Error generating slug for ${title} (${year}):`, error.message);
      return null;
    }
  }

  async updateMovieSlug(movieId, slug) {
    try {
      const { error } = await supabase
        .from('movies')
        .update({ 
          slug: slug,
          updated_at: new Date().toISOString()
        })
        .eq('id', movieId);
      
      if (error) {
        throw new Error(`Failed to update movie ${movieId}: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating slug for movie ${movieId}:`, error);
      return false;
    }
  }

  async processBatch() {
    try {
      const missingMovies = await this.findMoviesMissingSlug();
      
      if (missingMovies.length === 0) {
        return {
          success: true,
          message: 'No movies missing slugs',
          processed: 0,
          total_missing: 0
        };
      }

      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let totalCost = 0;
      const results = [];

      for (const movie of missingMovies) {
        try {
          console.log(`🎬 [${processed + 1}/${missingMovies.length}] ${movie.title} (${movie.year})`);
          
          const slug = await this.generateSlug(movie.title, movie.year);
          
          if (slug) {
            const updated = await this.updateMovieSlug(movie.id, slug);
            
            if (updated) {
              console.log(`   ✅ Generated: "${slug}"`);
              succeeded++;
              totalCost += 0.005; // Rough estimate
              results.push({
                title: movie.title,
                year: movie.year,
                slug: slug,
                status: 'success'
              });
            } else {
              console.log(`   ❌ Failed to save slug`);
              failed++;
              results.push({
                title: movie.title,
                year: movie.year,
                status: 'save_failed'
              });
            }
          } else {
            console.log(`   ❌ Failed to generate slug`);
            failed++;
            results.push({
              title: movie.title,
              year: movie.year,
              status: 'generation_failed'
            });
          }
          
          processed++;
          
          // Delay between requests to avoid rate limiting
          if (processed < missingMovies.length) {
            await new Promise(resolve => setTimeout(resolve, this.delay));
          }
          
        } catch (error) {
          console.error(`   💥 Error processing ${movie.title}:`, error.message);
          failed++;
          processed++;
          results.push({
            title: movie.title,
            year: movie.year,
            status: 'error',
            error: error.message
          });
        }
      }

      return {
        success: true,
        movies_processed: processed,
        succeeded: succeeded,
        failed: failed,
        estimated_cost: totalCost.toFixed(3),
        success_rate: ((succeeded / processed) * 100).toFixed(1),
        results: results,
        message: `Processed ${processed} movies, ${succeeded} successful`
      };
    } catch (error) {
      console.error('Slug batch processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSlugStatus() {
    try {
      // Get total count
      const { data: totalMovies, error: totalError } = await supabase
        .from('movies')
        .select('count');
      
      if (totalError) throw totalError;
      
      // Get movies with slugs
      const { data: moviesWithSlugs, error: slugError } = await supabase
        .from('movies')
        .select('count')
        .not('slug', 'is', null)
        .neq('slug', '');
      
      if (slugError) throw slugError;
      
      const total = totalMovies?.[0]?.count || 0;
      const withSlugs = moviesWithSlugs?.[0]?.count || 0;
      const missing = total - withSlugs;
      
      return {
        total_movies: total,
        movies_with_slugs: withSlugs,
        movies_missing_slugs: missing,
        coverage_percentage: total > 0 ? ((withSlugs / total) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting slug status:', error);
      throw error;
    }
  }
}

export default async function handler(req, res) {
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For GET requests, return slug status (no auth required)
  if (req.method === 'GET') {
    try {
      const processor = new RailwaySlugBatchProcessor();
      const status = await processor.getSlugStatus();
      
      return res.status(200).json({
        success: true,
        slug_status: status
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // For POST requests (cron jobs), verify auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_BATCH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const processor = new RailwaySlugBatchProcessor();
    const result = await processor.processBatch();

    // Log the result
    console.log('Slug batch processing result:', result);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Slug batch processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}