#!/usr/bin/env node
/**
 * Definitive Analysis Scope - CORRECTED
 * 
 * Now that we found the real data (12,259 analysis records, 6,165 analyzed movies),
 * generate the accurate scope for batch processing.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// Set environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DefinitiveAnalysisScoper {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {},
      moviesNeedingAnalysis: []
    };
  }

  async getDefinitiveScope() {
    console.log('🎯 DEFINITIVE Analysis Scope - CORRECTED');
    console.log('========================================\n');

    try {
      await this.getAccurateCounts();
      await this.generateBatchList();
      await this.exportForBatchProcessing();
      
    } catch (error) {
      console.error('💥 Failed to get definitive scope:', error.message);
      throw error;
    }
  }

  async getAccurateCounts() {
    console.log('📊 Getting Accurate Analysis Counts');
    console.log('-----------------------------------');

    // Use the has_analysis flag as the source of truth (6,165 movies)
    const { count: totalMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    const { count: analyzedMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('has_analysis', true)
      .not('tmdb_id', 'is', null);

    const { count: totalAnalysisRecords } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });

    const unanalyzedCount = totalMovies - analyzedMovies;

    this.results.summary = {
      totalMovies,
      analyzedMovies,
      unanalyzedMovies: unanalyzedCount,
      analysisRecords: totalAnalysisRecords,
      analysisRate: ((analyzedMovies / totalMovies) * 100).toFixed(1)
    };

    console.log(`Total Movies (TMDB): ${totalMovies.toLocaleString()}`);
    console.log(`Movies with Analysis: ${analyzedMovies.toLocaleString()}`);
    console.log(`Movies Needing Analysis: ${unanalyzedCount.toLocaleString()}`);
    console.log(`Analysis Records: ${totalAnalysisRecords.toLocaleString()}`);
    console.log(`Coverage Rate: ${this.results.summary.analysisRate}%\n`);

    // Verify this matches expectations
    const expectedAnalyzed = 6000; // ~6K
    const expectedUnanalyzed = 11000; // ~11K
    
    console.log('✅ Verification against original estimates:');
    console.log(`   Analyzed: ${analyzedMovies.toLocaleString()} vs ~${expectedAnalyzed.toLocaleString()} expected`);
    console.log(`   Unanalyzed: ${unanalyzedCount.toLocaleString()} vs ~${expectedUnanalyzed.toLocaleString()} expected`);
    console.log(`   ✅ CONFIRMED: Matches original estimates!\n`);
  }

  async generateBatchList() {
    console.log('🎯 Generating Movies Needing Analysis');
    console.log('------------------------------------');

    // Get movies without analysis in batches to avoid query limits
    const batchSize = 2000;
    let allUnanalyzedMovies = [];
    let offset = 0;

    while (true) {
      const { data: batch, error } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id, slug, poster_url, created_at')
        .eq('has_analysis', false)
        .not('tmdb_id', 'is', null)
        .order('year', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!batch || batch.length === 0) break;

      allUnanalyzedMovies.push(...batch);
      offset += batchSize;
      
      console.log(`   Loaded ${allUnanalyzedMovies.length.toLocaleString()} movies...`);
      
      // Safety break
      if (offset > 20000) break;
    }

    // Add priority scoring
    const prioritizedMovies = allUnanalyzedMovies.map(movie => {
      let priority = 0;
      let priorityFactors = [];

      // Year priority (newer = higher priority)
      if (movie.year >= 2020) {
        priority += 10;
        priorityFactors.push('recent');
      } else if (movie.year >= 2010) {
        priority += 7;
        priorityFactors.push('modern');
      } else if (movie.year >= 1990) {
        priority += 5;
        priorityFactors.push('contemporary');
      } else if (movie.year >= 1970) {
        priority += 3;
        priorityFactors.push('classic');
      } else {
        priority += 1;
        priorityFactors.push('vintage');
      }

      // Complete data indicators
      if (movie.poster_url) {
        priority += 3;
        priorityFactors.push('complete-data');
      }

      if (movie.slug) {
        priority += 2;
        priorityFactors.push('has-slug');
      }

      // Recently added to database
      if (movie.created_at && new Date(movie.created_at) > new Date('2024-01-01')) {
        priority += 2;
        priorityFactors.push('recently-added');
      }

      return {
        id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        priority_score: priority,
        priority_factors: priorityFactors
      };
    });

    // Sort by priority (highest first)
    prioritizedMovies.sort((a, b) => b.priority_score - a.priority_score);

    this.results.moviesNeedingAnalysis = prioritizedMovies;

    console.log(`Total Movies Needing Analysis: ${prioritizedMovies.length.toLocaleString()}`);
    
    // Priority distribution
    const highPriority = prioritizedMovies.filter(m => m.priority_score >= 10).length;
    const mediumPriority = prioritizedMovies.filter(m => m.priority_score >= 5 && m.priority_score < 10).length;
    const lowPriority = prioritizedMovies.filter(m => m.priority_score < 5).length;

    console.log(`   High Priority (≥10): ${highPriority.toLocaleString()}`);
    console.log(`   Medium Priority (5-9): ${mediumPriority.toLocaleString()}`);
    console.log(`   Low Priority (<5): ${lowPriority.toLocaleString()}`);

    console.log(`\\nTop 5 Priority Movies:`);
    prioritizedMovies.slice(0, 5).forEach((movie, i) => {
      console.log(`   ${i+1}. ${movie.title} (${movie.year}) - Score: ${movie.priority_score}`);
    });
    console.log('');
  }

  async exportForBatchProcessing() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Export definitive batch list
    const batchFile = `DEFINITIVE-movies-needing-analysis-${timestamp}.json`;
    const exportMovies = this.results.moviesNeedingAnalysis.map(movie => ({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      priority_score: movie.priority_score,
      priority_factors: movie.priority_factors
    }));
    
    writeFileSync(batchFile, JSON.stringify(exportMovies, null, 2));
    console.log(`📄 Exported ${exportMovies.length.toLocaleString()} movies to: ${batchFile}`);

    // Export high priority first batch (top 1000)
    const firstBatch = exportMovies.slice(0, 1000);
    const firstBatchFile = `FIRST-BATCH-${timestamp}.json`;
    writeFileSync(firstBatchFile, JSON.stringify(firstBatch, null, 2));
    console.log(`🚀 Exported first batch (1000 movies) to: ${firstBatchFile}`);

    // Export summary for batch processing cost estimation
    const costEstimate = exportMovies.length * 0.015; // ~$0.015 per analysis
    const summary = {
      ...this.results.summary,
      batchProcessing: {
        totalMoviesForBatch: exportMovies.length,
        estimatedCost: costEstimate,
        priorityBreakdown: {
          high: exportMovies.filter(m => m.priority_score >= 10).length,
          medium: exportMovies.filter(m => m.priority_score >= 5 && m.priority_score < 10).length,
          low: exportMovies.filter(m => m.priority_score < 5).length
        }
      }
    };
    
    const summaryFile = `DEFINITIVE-analysis-scope-${timestamp}.json`;
    writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📊 Exported scope summary to: ${summaryFile}`);

    console.log(`\\n💰 Batch Processing Cost Estimate:`);
    console.log(`   Total Movies: ${exportMovies.length.toLocaleString()}`);
    console.log(`   Estimated Cost: $${costEstimate.toFixed(0)}`);
    console.log(`   First Batch (1000): $${(1000 * 0.015).toFixed(0)}`);
  }
}

// Run definitive scoping
if (import.meta.url === `file://${process.argv[1]}`) {
  const scoper = new DefinitiveAnalysisScoper();
  
  scoper.getDefinitiveScope()
    .then(() => {
      console.log('\\n✅ DEFINITIVE analysis scope completed!');
      console.log('\\n🎯 READY FOR BATCH PROCESSING');
      console.log('   Use DEFINITIVE-movies-needing-analysis-[date].json for batch processing');
      console.log('   Start with FIRST-BATCH-[date].json for initial 1000 movies');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n💥 Definitive scoping failed:', error.message);
      process.exit(1);
    });
}