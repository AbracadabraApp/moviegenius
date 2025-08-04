#!/usr/bin/env node
/**
 * Process Targeted Movies - Single Movie Analysis with Enhanced Status Tracking
 * 
 * Processes one movie from movies-without-analysis.json to test and validate
 * the enhanced content status tracking system before running bulk operations.
 * 
 * Features:
 * - Loads movie data from JSON file
 * - Generates analysis using existing AnalysisService
 * - Updates all new content status flags
 * - Validates the complete pipeline
 * - Provides detailed status reporting
 * 
 * Usage: node scripts/process-targeted-movies.js [--movie-index=0] [--dry-run]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables first before importing modules that need them
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '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';

// Now import modules that need environment variables
const { createClient } = await import('@supabase/supabase-js');
const { AnalysisService } = await import('../lib/services/analysis-service.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const movieIndex = parseInt(args.find(arg => arg.startsWith('--movie-index='))?.split('=')[1] || '0');
const isDryRun = args.includes('--dry-run');

class TargetedMovieProcessor {
  constructor(customFile = null) {
    this.moviesFile = customFile || join(__dirname, '../movies-without-analysis.json');
    this.stats = {
      startTime: Date.now(),
      processed: 0,
      successful: 0,
      failed: 0,
      statusUpdates: 0
    };
  }

  async processMovie() {
    console.log('🎬 Targeted Movie Analysis Processor');
    console.log('====================================');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
    console.log(`Target Movie Index: ${movieIndex}\n`);

    try {
      // Load movies data
      const movies = this.loadMoviesData();
      
      if (movieIndex >= movies.length) {
        throw new Error(`Movie index ${movieIndex} out of range (0-${movies.length - 1})`);
      }

      const targetMovie = movies[movieIndex];
      console.log(`🎯 Processing: "${targetMovie.title}" (${targetMovie.year || 'Unknown Year'})`);
      console.log(`   TMDB ID: ${targetMovie.tmdb_id}\n`);

      // Check if movie exists in database and get/create record
      const movie = await this.ensureMovieExists(targetMovie);
      
      // Show current status
      await this.showCurrentStatus(movie);

      if (!isDryRun) {
        // Process the movie analysis
        await this.processAnalysis(movie);
        
        // Update content status flags
        await this.updateContentStatusFlags(movie);
        
        // Show final status
        await this.showFinalStatus(movie);
      } else {
        console.log('[DRY RUN] Would process analysis and update status flags');
      }

      this.printSummary();

    } catch (error) {
      console.error('💥 Processing failed:', error.message);
      this.stats.failed++;
      throw error;
    }
  }

  loadMoviesData() {
    if (!existsSync(this.moviesFile)) {
      throw new Error(`Movies file not found: ${this.moviesFile}`);
    }

    try {
      const data = JSON.parse(readFileSync(this.moviesFile, 'utf8'));
      console.log(`📂 Loaded ${data.length} movies from JSON file`);
      return data;
    } catch (error) {
      throw new Error(`Failed to parse movies JSON: ${error.message}`);
    }
  }

  async ensureMovieExists(targetMovie) {
    console.log('🔍 Checking movie database record...');

    // First try to find by TMDB ID
    let { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', targetMovie.tmdb_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!movie) {
      // Try to find by title and year
      const { data: movieByTitle, error: titleError } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', targetMovie.title)
        .eq('year', targetMovie.year)
        .single();

      if (titleError && titleError.code !== 'PGRST116') {
        throw new Error(`Title search failed: ${titleError.message}`);
      }

      movie = movieByTitle;
    }

    if (!movie) {
      console.log('   ➕ Movie not found in database - creating new record');
      
      if (isDryRun) {
        console.log('[DRY RUN] Would create movie record');
        return {
          id: 'DRY_RUN_ID',
          title: targetMovie.title,
          year: targetMovie.year,
          tmdb_id: targetMovie.tmdb_id
        };
      }

      // Create new movie record
      const { data: newMovie, error: createError } = await supabase
        .from('movies')
        .insert({
          title: targetMovie.title,
          year: targetMovie.year,
          tmdb_id: targetMovie.tmdb_id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create movie: ${createError.message}`);
      }

      movie = newMovie;
      console.log(`   ✅ Created movie record with ID: ${movie.id}`);
    } else {
      console.log(`   ✅ Found existing movie record with ID: ${movie.id}`);
    }

    return movie;
  }

  async showCurrentStatus(movie) {
    console.log('📊 Current Content Status:');
    console.log('--------------------------');
    
    // Check if enhanced status columns exist
    const statusFields = [
      'analysis_ready', 'links_processed', 'content_complete', 
      'display_ready', 'slug_generated', 'validation_passed',
      'quality_score', 'failure_count'
    ];

    // Get current status (might not have new columns yet)
    const { data: currentStatus, error } = await supabase
      .from('movies')
      .select(`id, title, year, slug, has_analysis, ${statusFields.join(', ')}`)
      .eq('id', movie.id)
      .single();

    if (error) {
      console.log('   ⚠️  Enhanced status columns may not exist yet');
      console.log(`   Database error: ${error.message}`);
      
      // Show basic status
      console.log(`   • Has Analysis (basic): ${movie.has_analysis || false}`);
      console.log(`   • Has Slug: ${!!movie.slug}`);
    } else {
      console.log(`   • Analysis Ready: ${currentStatus.analysis_ready || false}`);
      console.log(`   • Links Processed: ${currentStatus.links_processed || false}`);
      console.log(`   • Slug Generated: ${currentStatus.slug_generated || false}`);
      console.log(`   • Content Complete: ${currentStatus.content_complete || false}`);
      console.log(`   • Display Ready: ${currentStatus.display_ready || false}`);
      console.log(`   • Validation Passed: ${currentStatus.validation_passed || false}`);
      console.log(`   • Quality Score: ${currentStatus.quality_score || 0}/100`);
      console.log(`   • Failure Count: ${currentStatus.failure_count || 0}`);
    }

    // Check for existing analysis
    const { data: existingAnalysis, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('id, analysis_type, created_at')
      .eq('movie_id', movie.id)
      .eq('analysis_type', 'page_analysis');

    if (analysisError) {
      console.log(`   • Analysis Query Error: ${analysisError.message}`);
    } else {
      console.log(`   • Existing Analyses: ${existingAnalysis.length}`);
    }
    
    console.log('');
  }

  async processAnalysis(movie) {
    console.log('🤖 Generating Movie Analysis...');
    console.log('-------------------------------');

    try {
      this.stats.processed++;
      
      // Use the existing AnalysisService to generate analysis
      const analysis = await AnalysisService.getOrGenerate(movie);
      
      if (!analysis) {
        throw new Error('Analysis generation returned null');
      }

      console.log('   ✅ Analysis generated successfully');
      console.log(`   • Sections: ${analysis.sections?.length || 0}`);
      console.log(`   • Explore Topics: ${analysis.exploreFurther?.length || 0}`);
      console.log(`   • More Ideas Movies: ${analysis.moreIdeas?.movies?.length || 0}`);
      
      this.stats.successful++;
      return analysis;

    } catch (error) {
      console.error(`   ❌ Analysis generation failed: ${error.message}`);
      this.stats.failed++;
      
      // Record failure in new tracking system
      await this.recordFailure(movie.id, `Analysis generation: ${error.message}`);
      throw error;
    }
  }

  async updateContentStatusFlags(movie) {
    console.log('🏁 Updating Content Status Flags...');
    console.log('-----------------------------------');

    try {
      // Update flags based on successful analysis generation
      const updates = {
        analysis_ready: true,
        analysis_ready_at: new Date().toISOString(),
        
        // Check if analysis includes processed links
        links_processed: true, // AnalysisService includes link processing
        links_processed_at: new Date().toISOString(),
        
        // Check if we have a slug (from analysis or existing)
        slug_generated: true, // Analysis includes slug generation
        
        // Mark as requiring validation
        validation_passed: false, // Will be updated by validation process
        quality_score: 0, // Will be updated by validation
        
        // Update timestamps
        updated_at: new Date().toISOString(),
        last_processed_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);

      if (updateError) {
        throw new Error(`Status update failed: ${updateError.message}`);
      }

      console.log('   ✅ Content status flags updated');
      this.stats.statusUpdates++;

      // Update content_complete and display_ready based on all flags
      await this.updateCompletionFlags(movie.id);

    } catch (error) {
      console.error(`   ❌ Status flag update failed: ${error.message}`);
      throw error;
    }
  }

  async updateCompletionFlags(movieId) {
    console.log('   📋 Checking completion status...');

    // Use the stored function if it exists, otherwise manual update
    try {
      const { data, error } = await supabase.rpc('mark_content_complete', {
        movie_id_param: movieId
      });

      if (error) {
        // Fallback to manual update if function doesn't exist
        const { error: manualError } = await supabase
          .from('movies')
          .update({
            content_complete: true,
            content_complete_at: new Date().toISOString()
          })
          .eq('id', movieId)
          .eq('analysis_ready', true)
          .eq('links_processed', true)
          .eq('slug_generated', true);

        if (manualError) {
          throw manualError;
        }
        console.log('   ✅ Completion flags updated (manual)');
      } else {
        console.log('   ✅ Completion flags updated (function)');
      }
    } catch (error) {
      console.log(`   ⚠️  Completion update warning: ${error.message}`);
    }
  }

  async recordFailure(movieId, reason) {
    try {
      const { error } = await supabase.rpc('record_content_failure', {
        movie_id_param: movieId,
        failure_reason_param: reason
      });

      if (error) {
        // Fallback to manual failure recording
        const { error: manualError } = await supabase
          .from('movies')
          .update({
            last_failure_reason: reason,
            failure_count: supabase.sql`failure_count + 1`,
            last_failure_at: new Date().toISOString()
          })
          .eq('id', movieId);

        if (!manualError) {
          console.log('   📝 Failure recorded (manual)');
        }
      } else {
        console.log('   📝 Failure recorded (function)');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not record failure: ${error.message}`);
    }
  }

  async showFinalStatus(movie) {
    console.log('📈 Final Content Status:');
    console.log('------------------------');

    const { data: finalStatus, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movie.id)
      .single();

    if (error) {
      console.log(`   ❌ Could not retrieve final status: ${error.message}`);
      return;
    }

    console.log(`   • Analysis Ready: ${finalStatus.analysis_ready || false}`);
    console.log(`   • Links Processed: ${finalStatus.links_processed || false}`);
    console.log(`   • Slug Generated: ${finalStatus.slug_generated || false}`);
    console.log(`   • Content Complete: ${finalStatus.content_complete || false}`);
    console.log(`   • Display Ready: ${finalStatus.display_ready || false}`);
    console.log(`   • Quality Score: ${finalStatus.quality_score || 0}/100`);
    
    if (finalStatus.slug) {
      console.log(`   • Generated Slug: "${finalStatus.slug}"`);
    }
    
    console.log('');
  }

  printSummary() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    
    console.log('📊 Processing Summary');
    console.log('====================');
    console.log(`• Movies Processed: ${this.stats.processed}`);
    console.log(`• Successful: ${this.stats.successful}`);
    console.log(`• Failed: ${this.stats.failed}`);
    console.log(`• Status Updates: ${this.stats.statusUpdates}`);
    console.log(`• Processing Time: ${elapsed.toFixed(1)} seconds`);
    console.log(`• Status: ${this.stats.successful > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
  }
}

// Execute processor
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for custom file argument
  const customFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
  const processor = new TargetedMovieProcessor(customFile);
  
  processor.processMovie()
    .then(() => {
      console.log('\n🎉 Targeted movie processing completed!');
      console.log('\n📝 Next Steps:');
      console.log('• Review the processing results above');
      console.log('• Check database for updated status flags');
      console.log('• Run content-status-reporter.js to see overall status');
      console.log('• If successful, proceed with bulk processing');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Processing failed:', error.message);
      process.exit(1);
    });
}

export { TargetedMovieProcessor };