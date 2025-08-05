// Enhanced migration script for full Supabase → Railway PostgreSQL migration
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Railway connection
const getRailwayClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
  });
};

class MigrationProgress {
  constructor() {
    this.stats = {
      movies: { success: 0, failed: 0, skipped: 0 },
      analyses: { success: 0, failed: 0, skipped: 0 },
      startTime: Date.now(),
      currentBatch: 0
    };
    this.failures = [];
  }

  logMovie(status, movie, error = null) {
    this.stats.movies[status]++;
    if (error) {
      this.failures.push({ type: 'movie', movie: movie.title, error: error.message });
    }
  }

  logAnalysis(status, movieTitle, error = null) {
    this.stats.analyses[status]++;
    if (error) {
      this.failures.push({ type: 'analysis', movie: movieTitle, error: error.message });
    }
  }

  getStatus() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const totalMovies = this.stats.movies.success + this.stats.movies.failed + this.stats.movies.skipped;
    const totalAnalyses = this.stats.analyses.success + this.stats.analyses.failed + this.stats.analyses.skipped;
    
    return {
      elapsed: `${Math.floor(elapsed / 60)}m ${Math.floor(elapsed % 60)}s`,
      movies: {
        total: totalMovies,
        ...this.stats.movies,
        successRate: totalMovies > 0 ? (this.stats.movies.success / totalMovies * 100).toFixed(1) : 0
      },
      analyses: {
        total: totalAnalyses,
        ...this.stats.analyses,
        successRate: totalAnalyses > 0 ? (this.stats.analyses.success / totalAnalyses * 100).toFixed(1) : 0
      },
      failures: this.failures.slice(-5) // Last 5 failures
    };
  }
}

async function migrateMovieBatch(movies, progress, batchNum) {
  console.log(`\n📦 Processing batch ${batchNum}: ${movies.length} movies`);
  
  const railwayClient = getRailwayClient();
  await railwayClient.connect();

  try {
    for (const movie of movies) {
      try {
        // Insert movie with conflict handling
        const movieQuery = `
          INSERT INTO movies (
            tmdb_id, title, year, official_title, release_date, slug, 
            poster_url, streaming_data, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            title = EXCLUDED.title,
            year = EXCLUDED.year,
            official_title = EXCLUDED.official_title,
            release_date = EXCLUDED.release_date,
            slug = EXCLUDED.slug,
            poster_url = EXCLUDED.poster_url,
            streaming_data = EXCLUDED.streaming_data,
            updated_at = NOW()
          RETURNING id;
        `;

        const movieValues = [
          movie.tmdb_id,
          movie.title,
          movie.year,
          movie.official_title,
          movie.release_date,
          movie.slug,
          movie.poster_url,
          movie.streaming_data,
          movie.created_at || new Date(),
          new Date()
        ];

        const movieResult = await railwayClient.query(movieQuery, movieValues);
        const railwayMovieId = movieResult.rows[0].id;
        
        progress.logMovie('success', movie);

        // Migrate analyses for this movie
        const { data: analyses, error: analysisError } = await supabase
          .from('movie_analyses')
          .select('*')
          .eq('movie_id', movie.id)
          .order('created_at', { ascending: false });

        if (analyses && analyses.length > 0) {
          for (const analysis of analyses) {
            try {
              const analysisQuery = `
                INSERT INTO movie_analyses (
                  movie_id, query_text, claude_response, analysis_type, 
                  people_extracted, has_links, link_count, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id;
              `;

              const analysisValues = [
                railwayMovieId,
                analysis.query_text,
                analysis.claude_response,
                analysis.analysis_type || 'general',
                analysis.people_extracted || false,
                analysis.has_links || false,
                analysis.link_count || 0,
                analysis.created_at || new Date()
              ];

              await railwayClient.query(analysisQuery, analysisValues);
              progress.logAnalysis('success', movie.title);
            } catch (error) {
              console.error(`   ❌ Analysis failed for ${movie.title}:`, error.message);
              progress.logAnalysis('failed', movie.title, error);
            }
          }
        }

      } catch (error) {
        console.error(`   ❌ Movie failed ${movie.title}:`, error.message);
        progress.logMovie('failed', movie, error);
      }
    }
  } finally {
    await railwayClient.end();
  }
}

async function migrateFullDataset(options = {}) {
  const { 
    batchSize = 500, 
    testMode = false,
    maxMovies = null 
  } = options;

  console.log('🚚 Starting full dataset migration from Supabase to Railway...');
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Test mode: ${testMode ? 'ON' : 'OFF'}`);
  if (maxMovies) console.log(`   Max movies: ${maxMovies}`);

  const progress = new MigrationProgress();

  try {
    // Get total count first
    const { count: totalCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total movies in Supabase: ${totalCount}`);
    
    const effectiveMax = maxMovies ? Math.min(maxMovies, totalCount) : totalCount;
    const totalBatches = Math.ceil(effectiveMax / batchSize);
    
    console.log(`📋 Migration plan: ${effectiveMax} movies in ${totalBatches} batches\n`);

    // Process in batches
    for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
      const offset = (batchNum - 1) * batchSize;
      const limit = Math.min(batchSize, effectiveMax - offset);

      console.log(`\n📦 Fetching batch ${batchNum}/${totalBatches} (offset: ${offset}, limit: ${limit})`);

      // Fetch batch from Supabase
      const { data: movies, error } = await supabase
        .from('movies')
        .select('*')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`❌ Failed to fetch batch ${batchNum}:`, error.message);
        continue;
      }

      if (!movies || movies.length === 0) {
        console.log(`⚠️  Batch ${batchNum} returned no movies, stopping`);
        break;
      }

      // Migrate the batch
      await migrateMovieBatch(movies, progress, batchNum);
      progress.stats.currentBatch = batchNum;

      // Status update every batch
      const status = progress.getStatus();
      console.log(`\n📊 Batch ${batchNum} Status:`);
      console.log(`   Movies: ${status.movies.success}✅ ${status.movies.failed}❌ ${status.movies.skipped}⏭️ (${status.movies.successRate}% success)`);
      console.log(`   Analyses: ${status.analyses.success}✅ ${status.analyses.failed}❌ (${status.analyses.successRate}% success)`);
      console.log(`   Elapsed: ${status.elapsed}`);

      // Pause between batches to avoid overwhelming the DB
      if (batchNum < totalBatches) {
        console.log(`⏸️  Pausing 2s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final status
    const finalStatus = progress.getStatus();
    console.log(`\n🎉 Migration Complete!`);
    console.log(`📊 Final Statistics:`);
    console.log(`   Total Time: ${finalStatus.elapsed}`);
    console.log(`   Movies: ${finalStatus.movies.success}✅ ${finalStatus.movies.failed}❌ ${finalStatus.movies.skipped}⏭️`);
    console.log(`   Analyses: ${finalStatus.analyses.success}✅ ${finalStatus.analyses.failed}❌`);
    console.log(`   Overall Success Rate: ${finalStatus.movies.successRate}%`);

    if (progress.failures.length > 0) {
      console.log(`\n⚠️  Recent Failures:`);
      progress.failures.slice(-10).forEach(f => {
        console.log(`   ${f.type}: ${f.movie} - ${f.error}`);
      });
    }

    return finalStatus;

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Export for use as module or run directly
export { migrateFullDataset };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const maxMoviesArg = args.find(arg => arg.startsWith('--max-movies='));
  
  const options = {
    testMode,
    batchSize: batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 500,
    maxMovies: maxMoviesArg ? parseInt(maxMoviesArg.split('=')[1]) : null
  };

  migrateFullDataset(options).catch(console.error);
}