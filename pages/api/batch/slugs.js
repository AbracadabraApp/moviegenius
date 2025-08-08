/**
 * Railway Batch Processing API - Slugs [DISABLED FOR ZERO-WASTE]
 *
 * This endpoint is disabled to prevent continuous slug regeneration waste.
 * Slugs are now generated once during movie creation via createBasicMovieEntry.
 * Use scripts/one-time-slug-backfill.js for backfilling existing movies.
 */

import { createClient, supabase } from '../../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../../lib/railway-db.js';
import { Anthropic } from '@anthropic-ai/sdk';

const pool = getPool();

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
          const missingInBatch = batch.filter(
            movie =>
              movie.slug === null || movie.slug === '' || (movie.slug && movie.slug.trim() === '')
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
    const prompt = `Create a powerful movie poster tagline for "${title}" (${year}).

RULES:
- Maximum 50 characters
- NO plot details or story descriptions  
- NO actor names or character names
- Focus on EMOTION, STAKES, or MYSTERY
- Think movie poster marketing copy

GOOD Examples:
- "Fear has a new address"
- "Some secrets should stay buried" 
- "The hunt begins"
- "Trust no one"
- "Love is the ultimate sacrifice"
- "Revenge never felt so good"
- "The game changes everything"

BAD Examples to AVOID:
- "A man discovers his wife's secret" (plot detail)
- "Comedy starring Will Ferrell" (actor name)
- "Two friends go on adventure" (description)

Return ONLY the tagline, nothing else.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let slug = message.content[0].text.trim();

      // Remove quotes if Claude added them
      if (slug.startsWith('"') && slug.endsWith('"')) {
        slug = slug.slice(1, -1);
      }

      // Validate slug quality
      if (slug.length > 50) {
        console.warn(`⚠️  Slug too long (${slug.length} chars): "${slug}"`);
        return null; // Will trigger retry in calling code
      }

      // Check for banned content
      const lowerSlug = slug.toLowerCase();
      const bannedPatterns = [
        'starring',
        'stars',
        'features',
        'follows',
        'story of',
        'about',
        'when ',
        'after ',
        'before ',
        'during ',
        'chronicles',
        'depicts',
      ];

      for (const pattern of bannedPatterns) {
        if (lowerSlug.includes(pattern)) {
          console.warn(`⚠️  Slug contains banned pattern "${pattern}": "${slug}"`);
          return null; // Will trigger retry in calling code
        }
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
          updated_at: new Date().toISOString(),
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
          total_missing: 0,
        };
      }

      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let totalCost = 0;
      const results = [];

      for (const movie of missingMovies) {
        try {
          console.log(
            `🎬 [${processed + 1}/${missingMovies.length}] ${movie.title} (${movie.year})`
          );

          let slug = null;
          let attempts = 0;
          const maxAttempts = 3;

          // Retry up to 3 times if validation fails
          while (!slug && attempts < maxAttempts) {
            attempts++;
            if (attempts > 1) {
              console.log(`   🔄 Retry ${attempts}/${maxAttempts}`);
            }
            slug = await this.generateSlug(movie.title, movie.year);
          }

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
                status: 'success',
              });
            } else {
              console.log(`   ❌ Failed to save slug`);
              failed++;
              results.push({
                title: movie.title,
                year: movie.year,
                status: 'save_failed',
              });
            }
          } else {
            console.log(`   ❌ Failed to generate slug`);
            failed++;
            results.push({
              title: movie.title,
              year: movie.year,
              status: 'generation_failed',
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
            error: error.message,
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
        message: `Processed ${processed} movies, ${succeeded} successful`,
      };
    } catch (error) {
      console.error('Slug batch processing failed:', error);
      return {
        success: false,
        error: error.message,
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
        coverage_percentage: total > 0 ? ((withSlugs / total) * 100).toFixed(1) : 0,
      };
    } catch (error) {
      console.error('Error getting slug status:', error);
      throw error;
    }
  }
}

export default async function handler(req, res) {
  // DISABLED FOR ZERO-WASTE ARCHITECTURE
  // This endpoint is disabled to prevent continuous slug regeneration waste.
  // Slugs are now generated once during movie creation or via one-time backfill.
  return res.status(200).json({
    status: 'disabled',
    message: 'Slug batch processing disabled for zero-waste architecture',
    recommendation: 'Use scripts/one-time-slug-backfill.js for backfilling',
    timestamp: new Date().toISOString()
  });

  // Dead code below - unreachable due to return above
  /*
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
        slug_status: status,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
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
      error: error.message,
    });
  }
  */
}
