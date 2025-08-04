#!/usr/bin/env node
/**
 * Analysis Coverage Audit - Database Architect Edition
 * 
 * Comprehensive audit to verify actual analysis coverage and identify
 * the definitive list of movies that need analysis processing.
 * 
 * Provides:
 * - Accurate count of analyzed vs unanalyzed movies
 * - Validation of has_analysis flag accuracy
 * - Breakdown by movie characteristics (year, TMDB status, etc.)
 * - Priority ranking for batch processing
 * - Export of movies needing analysis for batch processing
 * 
 * Usage: node scripts/analysis-coverage-audit.js [--export] [--detailed]
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

// Parse command line arguments
const args = process.argv.slice(2);
const shouldExport = args.includes('--export');
const detailedMode = args.includes('--detailed');

class AnalysisCoverageAuditor {
  constructor() {
    this.auditResults = {
      timestamp: new Date().toISOString(),
      summary: {},
      flagAccuracy: {},
      breakdown: {},
      moviesNeedingAnalysis: [],
      recommendations: []
    };
    this.stats = {
      startTime: Date.now(),
      queriesExecuted: 0,
      totalMoviesProcessed: 0
    };
  }

  async runAudit() {
    console.log('🔍 Analysis Coverage Audit - Database Architect Edition');
    console.log('======================================================');
    console.log(`Started: ${new Date().toLocaleString()}`);
    console.log(`Mode: ${detailedMode ? 'DETAILED' : 'STANDARD'} | Export: ${shouldExport ? 'YES' : 'NO'}\n`);

    try {
      await this.auditOverallCounts();
      await this.auditFlagAccuracy();
      await this.auditByCharacteristics();
      await this.generateMoviesNeedingAnalysis();
      await this.generateRecommendations();
      
      this.displayResults();
      
      if (shouldExport) {
        this.exportResults();
      }

    } catch (error) {
      console.error('💥 Audit failed:', error.message);
      throw error;
    }
  }

  async auditOverallCounts() {
    console.log('📊 Overall Analysis Coverage');
    console.log('----------------------------');

    // Get total movies with TMDB IDs (valid candidates for analysis)
    const { data: allMovies, error: moviesError, count: totalMoviesCount } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    if (moviesError) throw moviesError;
    this.stats.queriesExecuted++;

    // Get movies with actual analysis records
    const { data: analyzedMovies, error: analysisError, count: analyzedCount } = await supabase
      .from('movie_analyses')
      .select('movie_id', { count: 'exact', head: true })
      .eq('analysis_type', 'movie_analysis');

    if (analysisError) throw analysisError;
    this.stats.queriesExecuted++;

    // Get movies with has_analysis = true flag
    const { data: flaggedMovies, error: flagError, count: flaggedCount } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .eq('has_analysis', true)
      .not('tmdb_id', 'is', null);

    if (flagError) throw flagError;
    this.stats.queriesExecuted++;

    const unanalyzedCount = totalMoviesCount - analyzedCount;
    const analysisRate = ((analyzedCount / totalMoviesCount) * 100).toFixed(1);

    this.auditResults.summary = {
      totalMovies: totalMoviesCount,
      analyzedMovies: analyzedCount,
      unanalyzedMovies: unanalyzedCount,
      analysisRate: parseFloat(analysisRate),
      flaggedAsAnalyzed: flaggedCount
    };

    console.log(`Total Movies (with TMDB): ${totalMoviesCount.toLocaleString()}`);
    console.log(`Movies with Analysis: ${analyzedCount.toLocaleString()}`);
    console.log(`Movies without Analysis: ${unanalyzedCount.toLocaleString()}`);
    console.log(`Analysis Coverage Rate: ${analysisRate}%`);
    console.log(`Movies flagged has_analysis=true: ${flaggedCount.toLocaleString()}\n`);
  }

  async auditFlagAccuracy() {
    console.log('🔍 Analysis Flag Accuracy Check');
    console.log('-------------------------------');

    // Find movies with analysis but has_analysis = false (false negatives)
    const { data: falseNegatives, error: fnError } = await supabase
      .from('movies')
      .select(`
        id, title, year, tmdb_id, has_analysis,
        movie_analyses!inner(id, analysis_type)
      `)
      .eq('has_analysis', false)
      .eq('movie_analyses.analysis_type', 'movie_analysis')
      .not('tmdb_id', 'is', null)
      .limit(detailedMode ? 50 : 10);

    if (fnError) throw fnError;
    this.stats.queriesExecuted++;

    // Find movies with has_analysis = true but no actual analysis (false positives)
    const { data: falsePositives, error: fpError } = await supabase
      .from('movies')
      .select(`
        id, title, year, tmdb_id, has_analysis
      `)
      .eq('has_analysis', true)
      .not('tmdb_id', 'is', null)
      .limit(detailedMode ? 50 : 10);

    if (fpError) throw fpError;
    this.stats.queriesExecuted++;

    // Check which ones actually have analysis
    const falsePositiveIds = falsePositives.map(m => m.id);
    const { data: actualAnalyses, error: aaError } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .in('movie_id', falsePositiveIds)
      .eq('analysis_type', 'movie_analysis');

    if (aaError) throw aaError;
    this.stats.queriesExecuted++;

    const actualAnalysisIds = new Set(actualAnalyses.map(a => a.movie_id));
    const trueFalsePositives = falsePositives.filter(m => !actualAnalysisIds.has(m.id));

    this.auditResults.flagAccuracy = {
      falseNegatives: falseNegatives.length,
      falsePositives: trueFalsePositives.length,
      flagAccuracyRate: ((this.auditResults.summary.totalMovies - falseNegatives.length - trueFalsePositives.length) / this.auditResults.summary.totalMovies * 100).toFixed(1)
    };

    console.log(`False Negatives (has analysis but flag=false): ${falseNegatives.length}`);
    console.log(`False Positives (flag=true but no analysis): ${trueFalsePositives.length}`);
    console.log(`Flag Accuracy Rate: ${this.auditResults.flagAccuracy.flagAccuracyRate}%`);

    if (detailedMode && falseNegatives.length > 0) {
      console.log('\nSample False Negatives:');
      falseNegatives.slice(0, 5).forEach(movie => {
        console.log(`  • ${movie.title} (${movie.year}) - TMDB:${movie.tmdb_id}`);
      });
    }

    if (detailedMode && trueFalsePositives.length > 0) {
      console.log('\nSample False Positives:');
      trueFalsePositives.slice(0, 5).forEach(movie => {
        console.log(`  • ${movie.title} (${movie.year}) - TMDB:${movie.tmdb_id}`);
      });
    }
    console.log('');
  }

  async auditByCharacteristics() {
    console.log('📈 Analysis Coverage by Movie Characteristics');
    console.log('--------------------------------------------');

    // Coverage by decade
    const { data: byDecade, error: decadeError } = await supabase
      .from('movies')
      .select(`
        year,
        has_analysis,
        movie_analyses!left(id, analysis_type)
      `)
      .not('tmdb_id', 'is', null)
      .not('year', 'is', null)
      .order('year');

    if (decadeError) throw decadeError;
    this.stats.queriesExecuted++;

    // Group by decade
    const decadeStats = {};
    byDecade.forEach(movie => {
      const decade = Math.floor(movie.year / 10) * 10;
      if (!decadeStats[decade]) {
        decadeStats[decade] = { total: 0, analyzed: 0 };
      }
      decadeStats[decade].total++;
      
      const hasActualAnalysis = movie.movie_analyses && movie.movie_analyses.length > 0 &&
        movie.movie_analyses.some(a => a.analysis_type === 'movie_analysis');
      if (hasActualAnalysis) {
        decadeStats[decade].analyzed++;
      }
    });

    // Coverage by creation date (batch processing history)
    const { data: byCreation, error: creationError } = await supabase
      .from('movies')
      .select(`
        created_at,
        movie_analyses!left(id, analysis_type)
      `)
      .not('tmdb_id', 'is', null)
      .gte('created_at', '2024-01-01')
      .order('created_at');

    if (creationError) throw creationError;
    this.stats.queriesExecuted++;

    this.auditResults.breakdown = {
      byDecade: Object.fromEntries(
        Object.entries(decadeStats)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([decade, stats]) => [
            `${decade}s`,
            {
              ...stats,
              coverageRate: ((stats.analyzed / stats.total) * 100).toFixed(1)
            }
          ])
      ),
      recentMovies: {
        total: byCreation.length,
        analyzed: byCreation.filter(m => 
          m.movie_analyses && m.movie_analyses.length > 0 &&
          m.movie_analyses.some(a => a.analysis_type === 'movie_analysis')
        ).length
      }
    };

    console.log('Coverage by Decade:');
    Object.entries(this.auditResults.breakdown.byDecade).slice(0, 8).forEach(([decade, stats]) => {
      console.log(`  ${decade}: ${stats.analyzed}/${stats.total} (${stats.coverageRate}%)`);
    });

    console.log(`\nRecent Movies (2024+): ${this.auditResults.breakdown.recentMovies.analyzed}/${this.auditResults.breakdown.recentMovies.total} analyzed\n`);
  }

  async generateMoviesNeedingAnalysis() {
    console.log('🎯 Generating Definitive List - Movies Needing Analysis');
    console.log('------------------------------------------------------');

    // Get all movies that need analysis with priority scoring
    const { data: needingAnalysis, error: needError } = await supabase
      .from('movies')
      .select(`
        id, title, year, tmdb_id, slug, created_at, poster_url,
        movie_analyses!left(id, analysis_type)
      `)
      .not('tmdb_id', 'is', null)
      .order('year', { ascending: false });

    if (needError) throw needError;
    this.stats.queriesExecuted++;

    // Filter movies that actually need analysis
    const moviesNeedingAnalysis = needingAnalysis.filter(movie => {
      const hasActualAnalysis = movie.movie_analyses && movie.movie_analyses.length > 0 &&
        movie.movie_analyses.some(a => a.analysis_type === 'movie_analysis');
      return !hasActualAnalysis;
    });

    // Add priority scoring
    const prioritizedMovies = moviesNeedingAnalysis.map(movie => {
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

      // Has poster (indicates complete TMDB data)
      if (movie.poster_url) {
        priority += 3;
        priorityFactors.push('complete-data');
      }

      // Has slug (partially processed)
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
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id,
        priority_score: priority,
        priority_factors: priorityFactors,
        created_at: movie.created_at
      };
    });

    // Sort by priority score (highest first)
    prioritizedMovies.sort((a, b) => b.priority_score - a.priority_score);

    this.auditResults.moviesNeedingAnalysis = prioritizedMovies;
    this.stats.totalMoviesProcessed = moviesNeedingAnalysis.length;

    console.log(`Total Movies Needing Analysis: ${prioritizedMovies.length.toLocaleString()}`);
    
    // Priority breakdown
    const highPriority = prioritizedMovies.filter(m => m.priority_score >= 10).length;
    const mediumPriority = prioritizedMovies.filter(m => m.priority_score >= 5 && m.priority_score < 10).length;
    const lowPriority = prioritizedMovies.filter(m => m.priority_score < 5).length;

    console.log(`High Priority (score ≥10): ${highPriority.toLocaleString()}`);
    console.log(`Medium Priority (score 5-9): ${mediumPriority.toLocaleString()}`);
    console.log(`Low Priority (score <5): ${lowPriority.toLocaleString()}`);

    if (detailedMode) {
      console.log('\nTop 10 Priority Movies:');
      prioritizedMovies.slice(0, 10).forEach((movie, index) => {
        console.log(`  ${index + 1}. ${movie.title} (${movie.year}) - Score: ${movie.priority_score} [${movie.priority_factors.join(', ')}]`);
      });
    }
    console.log('');
  }

  async generateRecommendations() {
    const recommendations = [];
    const summary = this.auditResults.summary;
    const movies = this.auditResults.moviesNeedingAnalysis;

    // Batch processing recommendations
    if (movies.length > 10000) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Large-scale batch processing required',
        details: `${movies.length.toLocaleString()} movies need analysis`,
        estimatedCost: `$${(movies.length * 0.015).toFixed(0)}`,
        estimatedTime: `${Math.ceil(movies.length / 100)} hours at 100 movies/hour`
      });
    } else if (movies.length > 1000) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Medium-scale batch processing',
        details: `${movies.length.toLocaleString()} movies need analysis`,
        estimatedCost: `$${(movies.length * 0.015).toFixed(0)}`,
        estimatedTime: `${Math.ceil(movies.length / 200)} hours at 200 movies/hour`
      });
    }

    // Flag synchronization recommendations
    if (this.auditResults.flagAccuracy.falseNegatives > 100) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Fix has_analysis flag synchronization',
        details: `${this.auditResults.flagAccuracy.falseNegatives} movies have analysis but flag=false`,
        command: 'UPDATE movies SET has_analysis = true WHERE id IN (SELECT movie_id FROM movie_analyses WHERE analysis_type = \'movie_analysis\')'
      });
    }

    // Processing strategy recommendations
    const highPriorityCount = movies.filter(m => m.priority_score >= 10).length;
    if (highPriorityCount > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Process high-priority movies first',
        details: `Start with ${highPriorityCount.toLocaleString()} recent/complete movies`,
        rationale: 'Better user experience and higher engagement'
      });
    }

    this.auditResults.recommendations = recommendations;
  }

  displayResults() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    
    console.log('📋 Audit Summary');
    console.log('================');
    console.log(`• Total Movies Audited: ${this.auditResults.summary.totalMovies.toLocaleString()}`);
    console.log(`• Movies with Analysis: ${this.auditResults.summary.analyzedMovies.toLocaleString()}`);
    console.log(`• Movies Needing Analysis: ${this.auditResults.summary.unanalyzedMovies.toLocaleString()}`);
    console.log(`• Analysis Coverage: ${this.auditResults.summary.analysisRate}%`);
    console.log(`• Flag Accuracy: ${this.auditResults.flagAccuracy.flagAccuracyRate}%`);
    console.log(`• Database queries executed: ${this.stats.queriesExecuted}`);
    console.log(`• Audit duration: ${elapsed.toFixed(1)} seconds`);

    if (this.auditResults.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.auditResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   ${rec.details}`);
        if (rec.estimatedCost) console.log(`   Estimated cost: ${rec.estimatedCost}`);
        if (rec.estimatedTime) console.log(`   Estimated time: ${rec.estimatedTime}`);
        if (rec.command) console.log(`   SQL: ${rec.command}`);
        console.log('');
      });
    }
  }

  exportResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Export movies needing analysis for batch processing
    const batchFile = `movies-needing-analysis-${timestamp}.json`;
    const batchMovies = this.auditResults.moviesNeedingAnalysis.map(movie => ({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      priority_score: movie.priority_score,
      priority_factors: movie.priority_factors
    }));
    
    writeFileSync(batchFile, JSON.stringify(batchMovies, null, 2));
    console.log(`📄 Exported ${batchMovies.length.toLocaleString()} movies to: ${batchFile}`);

    // Export full audit results
    const auditFile = `analysis-coverage-audit-${timestamp}.json`;
    writeFileSync(auditFile, JSON.stringify(this.auditResults, null, 2));
    console.log(`📊 Exported full audit results to: ${auditFile}`);

    // Export high-priority subset (first 1000)
    if (batchMovies.length > 1000) {
      const priorityFile = `high-priority-movies-${timestamp}.json`;
      const highPriorityMovies = batchMovies.slice(0, 1000);
      writeFileSync(priorityFile, JSON.stringify(highPriorityMovies, null, 2));
      console.log(`⭐ Exported top 1000 priority movies to: ${priorityFile}`);
    }
  }
}

// Execute audit
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new AnalysisCoverageAuditor();
  
  auditor.runAudit()
    .then(() => {
      console.log('\n✅ Analysis coverage audit completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Audit failed:', error.message);
      process.exit(1);
    });
}

export { AnalysisCoverageAuditor };