#!/usr/bin/env node

/**
 * Database Storage Validator
 * 
 * Comprehensive system for validating stored movie analyses,
 * detecting missing content, and identifying storage integrity issues.
 * 
 * Usage:
 *   node scripts/database-storage-validator.js --full-audit
 *   node scripts/database-storage-validator.js --missing-only
 *   node scripts/database-storage-validator.js --movie-id 12345
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

// Set environment variables if not already set
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DatabaseStorageValidator {
  constructor() {
    this.validationResults = {
      totalMovies: 0,
      moviesWithAnalysis: 0,
      moviesWithoutAnalysis: 0,
      corruptedAnalyses: 0,
      partialAnalyses: 0,
      analysisTypes: {
        movie_analysis: 0,
        page_analysis: 0
      },
      contentIssues: [],
      integrityViolations: [],
      performanceMetrics: {
        startTime: null,
        endTime: null,
        dbQueries: 0,
        avgQueryTime: 0
      }
    };
  }

  async executeValidation(options = {}) {
    const { fullAudit = false, missingOnly = false, movieId = null } = options;
    
    console.log('🔍 Database Storage Validation');
    console.log('==============================\n');
    
    this.validationResults.performanceMetrics.startTime = Date.now();
    
    try {
      if (movieId) {
        await this.validateSingleMovie(movieId);
      } else if (missingOnly) {
        await this.auditMissingContent();
      } else if (fullAudit) {
        await this.executeFullAudit();
      } else {
        await this.executeStandardValidation();
      }
      
      this.validationResults.performanceMetrics.endTime = Date.now();
      this.calculatePerformanceMetrics();
      this.printValidationReport();
      
      return this.validationResults;
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      throw error;
    }
  }

  async executeStandardValidation() {
    console.log('📊 Executing standard storage validation...\n');
    
    // Get basic movie and analysis counts
    await this.getBasicCounts();
    
    // Check for content integrity issues
    await this.checkContentIntegrity();
    
    // Identify missing analyses
    await this.identifyMissingAnalyses();
    
    // Check analysis distribution
    await this.analyzeAnalysisDistribution();
  }

  async executeFullAudit() {
    console.log('🔍 Executing comprehensive full audit...\n');
    
    await this.executeStandardValidation();
    
    // Additional deep validation
    await this.validateAnalysisStructure();
    await this.checkDuplicateAnalyses();
    await this.validateForeignKeyIntegrity();
    await this.auditStorageEfficiency();
  }

  async auditMissingContent() {
    console.log('❌ Auditing missing content only...\n');
    
    await this.getBasicCounts();
    await this.identifyMissingAnalyses(true); // Detailed missing content report
  }

  async validateSingleMovie(movieId) {
    console.log(`🎬 Validating single movie (ID: ${movieId})...\n`);
    
    const movie = await this.getSingleMovieDetails(movieId);
    if (!movie) {
      console.log(`❌ Movie with ID ${movieId} not found`);
      return;
    }
    
    console.log(`📽️  Movie: ${movie.title} (${movie.year}) [TMDB: ${movie.tmdb_id}]`);
    
    const analyses = await this.getMovieAnalyses(movieId);
    await this.validateMovieAnalyses(movie, analyses);
  }

  async getBasicCounts() {
    console.log('📊 Getting basic database counts...');
    
    const queries = [
      { name: 'total_movies', query: supabase.from('movies').select('*', { count: 'exact', head: true }) },
      { name: 'total_analyses', query: supabase.from('movie_analyses').select('*', { count: 'exact', head: true }) },
      { name: 'movie_analysis_count', query: supabase.from('movie_analyses').select('*', { count: 'exact', head: true }).eq('analysis_type', 'movie_analysis') },
      { name: 'page_analysis_count', query: supabase.from('movie_analyses').select('*', { count: 'exact', head: true }).eq('analysis_type', 'page_analysis') }
    ];
    
    for (const { name, query } of queries) {
      const startTime = Date.now();
      const { count, error } = await query;
      const queryTime = Date.now() - startTime;
      
      this.validationResults.performanceMetrics.dbQueries++;
      
      if (error) {
        console.error(`  ❌ ${name} query failed:`, error.message);
        continue;
      }
      
      console.log(`  ✅ ${name}: ${count?.toLocaleString() || 0} (${queryTime}ms)`);
      
      switch (name) {
        case 'total_movies':
          this.validationResults.totalMovies = count || 0;
          break;
        case 'movie_analysis_count':
          this.validationResults.analysisTypes.movie_analysis = count || 0;
          break;
        case 'page_analysis_count':
          this.validationResults.analysisTypes.page_analysis = count || 0;
          break;
      }
    }
    
    console.log('');
  }

  async checkContentIntegrity() {
    console.log('🔍 Checking content integrity...');
    
    const { data: analyses, error } = await supabase
      .from('movie_analyses')
      .select('id, movie_id, analysis_type, claude_response, created_at')
      .limit(1000);
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to fetch analyses for integrity check:', error.message);
      return;
    }
    
    let corruptedCount = 0;
    let partialCount = 0;
    
    for (const analysis of analyses) {
      const issues = this.validateAnalysisIntegrity(analysis);
      
      if (issues.length > 0) {
        this.validationResults.contentIssues.push({
          analysisId: analysis.id,
          movieId: analysis.movie_id,
          analysisType: analysis.analysis_type,
          issues: issues
        });
        
        if (issues.some(issue => issue.severity === 'critical')) {
          corruptedCount++;
        } else {
          partialCount++;
        }
      }
    }
    
    this.validationResults.corruptedAnalyses = corruptedCount;
    this.validationResults.partialAnalyses = partialCount;
    
    console.log(`  ✅ Integrity check complete: ${corruptedCount} corrupted, ${partialCount} partial`);
    console.log('');
  }

  validateAnalysisIntegrity(analysis) {
    const issues = [];
    
    // Check if claude_response exists
    if (!analysis.claude_response) {
      issues.push({
        type: 'missing_claude_response',
        severity: 'critical',
        message: 'No claude_response data'
      });
      return issues;
    }
    
    const response = analysis.claude_response;
    
    // Check for required fields
    if (!response.raw_content) {
      issues.push({
        type: 'missing_raw_content',
        severity: 'critical',
        message: 'No raw_content in claude_response'
      });
    } else if (response.raw_content.length < 100) {
      issues.push({
        type: 'short_content',
        severity: 'warning',
        message: `Content too short: ${response.raw_content.length} characters`
      });
    }
    
    if (!response.cost_estimate) {
      issues.push({
        type: 'missing_cost_estimate',
        severity: 'warning',
        message: 'No cost estimate available'
      });
    }
    
    if (!response.model) {
      issues.push({
        type: 'missing_model',
        severity: 'warning',
        message: 'No model information'
      });
    }
    
    return issues;
  }

  async identifyMissingAnalyses(detailed = false) {
    console.log('❌ Identifying movies without analysis...');
    
    const { data: moviesWithoutAnalysis, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, has_analysis')
      .eq('has_analysis', false)
      .limit(detailed ? 100 : 10);
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to fetch movies without analysis:', error.message);
      return;
    }
    
    this.validationResults.moviesWithoutAnalysis = moviesWithoutAnalysis?.length || 0;
    this.validationResults.moviesWithAnalysis = this.validationResults.totalMovies - this.validationResults.moviesWithoutAnalysis;
    
    console.log(`  📊 Movies without analysis: ${this.validationResults.moviesWithoutAnalysis}`);
    console.log(`  📊 Movies with analysis: ${this.validationResults.moviesWithAnalysis}`);
    
    if (detailed && moviesWithoutAnalysis && moviesWithoutAnalysis.length > 0) {
      console.log('\n  📋 Sample movies needing analysis:');
      moviesWithoutAnalysis.slice(0, 10).forEach((movie, i) => {
        console.log(`    ${i + 1}. ${movie.title} (${movie.year}) [ID: ${movie.id}] [TMDB: ${movie.tmdb_id}]`);
      });
    }
    
    console.log('');
  }

  async analyzeAnalysisDistribution() {
    console.log('📈 Analyzing analysis type distribution...');
    
    const movieAnalysisCount = this.validationResults.analysisTypes.movie_analysis;
    const pageAnalysisCount = this.validationResults.analysisTypes.page_analysis;
    const totalAnalyses = movieAnalysisCount + pageAnalysisCount;
    
    if (totalAnalyses > 0) {
      const moviePercentage = Math.round((movieAnalysisCount / totalAnalyses) * 100);
      const pagePercentage = Math.round((pageAnalysisCount / totalAnalyses) * 100);
      
      console.log(`  📊 movie_analysis: ${movieAnalysisCount.toLocaleString()} (${moviePercentage}%)`);
      console.log(`  📊 page_analysis: ${pageAnalysisCount.toLocaleString()} (${pagePercentage}%)`);
    }
    
    console.log('');
  }

  async validateAnalysisStructure() {
    console.log('🏗️  Validating analysis structure...');
    
    // Sample recent analyses for structure validation
    const { data: recentAnalyses, error } = await supabase
      .from('movie_analyses')
      .select('claude_response, analysis_type')
      .order('created_at', { ascending: false })
      .limit(50);
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to fetch recent analyses:', error.message);
      return;
    }
    
    let structureIssues = 0;
    
    for (const analysis of recentAnalyses) {
      if (analysis.claude_response && analysis.claude_response.raw_content) {
        const content = analysis.claude_response.raw_content;
        
        // Check for expected structure elements
        if (!content.includes('PARAGRAPH:') && !content.includes('MOVIES:')) {
          structureIssues++;
        }
      }
    }
    
    console.log(`  📊 Structure validation: ${structureIssues}/${recentAnalyses.length} analyses have structural issues`);
    console.log('');
  }

  async checkDuplicateAnalyses() {
    console.log('🔄 Checking for duplicate analyses...');
    
    const { data: duplicates, error } = await supabase
      .from('movie_analyses')
      .select('movie_id, analysis_type, count(*)')
      .group('movie_id, analysis_type')
      .having('count(*) > 1');
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to check duplicates:', error.message);
      return;
    }
    
    console.log(`  📊 Duplicate analyses found: ${duplicates?.length || 0}`);
    console.log('');
  }

  async validateForeignKeyIntegrity() {
    console.log('🔗 Validating foreign key integrity...');
    
    const { data: orphanedAnalyses, error } = await supabase
      .from('movie_analyses')
      .select('id, movie_id')
      .not('movie_id', 'in', supabase.from('movies').select('id'));
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to check foreign key integrity:', error.message);
      return;
    }
    
    console.log(`  📊 Orphaned analyses: ${orphanedAnalyses?.length || 0}`);
    console.log('');
  }

  async auditStorageEfficiency() {
    console.log('💾 Auditing storage efficiency...');
    
    const { data: storagStats, error } = await supabase
      .from('movie_analyses')
      .select('claude_response')
      .limit(100);
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to audit storage:', error.message);
      return;
    }
    
    let totalSize = 0;
    let analysisSizes = [];
    
    for (const analysis of storagStats) {
      if (analysis.claude_response && analysis.claude_response.raw_content) {
        const size = JSON.stringify(analysis.claude_response).length;
        totalSize += size;
        analysisSizes.push(size);
      }
    }
    
    if (analysisSizes.length > 0) {
      const avgSize = Math.round(totalSize / analysisSizes.length);
      const maxSize = Math.max(...analysisSizes);
      const minSize = Math.min(...analysisSizes);
      
      console.log(`  📊 Avg analysis size: ${(avgSize / 1024).toFixed(1)}KB`);
      console.log(`  📊 Size range: ${(minSize / 1024).toFixed(1)}KB - ${(maxSize / 1024).toFixed(1)}KB`);
    }
    
    console.log('');
  }

  async getSingleMovieDetails(movieId) {
    const { data: movie, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, has_analysis')
      .eq('id', movieId)
      .single();
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to fetch movie details:', error.message);
      return null;
    }
    
    return movie;
  }

  async getMovieAnalyses(movieId) {
    const { data: analyses, error } = await supabase
      .from('movie_analyses')
      .select('id, analysis_type, claude_response, created_at')
      .eq('movie_id', movieId);
    
    this.validationResults.performanceMetrics.dbQueries++;
    
    if (error) {
      console.error('  ❌ Failed to fetch movie analyses:', error.message);
      return [];
    }
    
    return analyses || [];
  }

  async validateMovieAnalyses(movie, analyses) {
    console.log(`\n🔍 Analysis validation for ${movie.title}:`);
    
    if (analyses.length === 0) {
      console.log('  ❌ No analyses found');
      return;
    }
    
    analyses.forEach((analysis, i) => {
      console.log(`\n  Analysis ${i + 1} (${analysis.analysis_type}):`);
      console.log(`    📅 Created: ${analysis.created_at}`);
      
      const issues = this.validateAnalysisIntegrity(analysis);
      if (issues.length === 0) {
        console.log('    ✅ No integrity issues');
      } else {
        console.log('    ⚠️  Issues found:');
        issues.forEach(issue => {
          console.log(`      • ${issue.type}: ${issue.message} (${issue.severity})`);
        });
      }
      
      if (analysis.claude_response && analysis.claude_response.raw_content) {
        const contentLength = analysis.claude_response.raw_content.length;
        const cost = analysis.claude_response.cost_estimate || 0;
        console.log(`    📊 Content: ${contentLength} chars, Cost: $${cost.toFixed(4)}`);
      }
    });
  }

  calculatePerformanceMetrics() {
    const duration = this.validationResults.performanceMetrics.endTime - this.validationResults.performanceMetrics.startTime;
    const queryCount = this.validationResults.performanceMetrics.dbQueries;
    
    this.validationResults.performanceMetrics.avgQueryTime = queryCount > 0 ? Math.round(duration / queryCount) : 0;
  }

  printValidationReport() {
    const results = this.validationResults;
    const duration = results.performanceMetrics.endTime - results.performanceMetrics.startTime;
    
    console.log('=' .repeat(60));
    console.log('📊 STORAGE VALIDATION REPORT');
    console.log('='.repeat(60));
    
    // Basic metrics
    console.log(`📊 Total Movies: ${results.totalMovies.toLocaleString()}`);
    console.log(`✅ Movies with Analysis: ${results.moviesWithAnalysis.toLocaleString()}`);
    console.log(`❌ Movies without Analysis: ${results.moviesWithoutAnalysis.toLocaleString()}`);
    
    if (results.totalMovies > 0) {
      const analysisPercentage = Math.round((results.moviesWithAnalysis / results.totalMovies) * 100);
      console.log(`📈 Analysis Coverage: ${analysisPercentage}%`);
    }
    
    // Analysis types
    console.log('\n📋 Analysis Type Distribution:');
    console.log(`  🎬 movie_analysis: ${results.analysisTypes.movie_analysis.toLocaleString()}`);
    console.log(`  📄 page_analysis: ${results.analysisTypes.page_analysis.toLocaleString()}`);
    
    // Content issues
    if (results.contentIssues.length > 0) {
      console.log('\n⚠️  Content Issues Detected:');
      console.log(`  🔴 Corrupted analyses: ${results.corruptedAnalyses}`);
      console.log(`  🟡 Partial analyses: ${results.partialAnalyses}`);
      
      // Show sample issues
      const sampleIssues = results.contentIssues.slice(0, 5);
      if (sampleIssues.length > 0) {
        console.log('\n  Sample issues:');
        sampleIssues.forEach((issue, i) => {
          console.log(`    ${i + 1}. Movie ${issue.movieId} (${issue.analysisType}): ${issue.issues.length} issues`);
        });
      }
    } else {
      console.log('\n✅ No content integrity issues detected');
    }
    
    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    console.log(`  ⏱️  Total duration: ${Math.round(duration / 1000)}s`);
    console.log(`  🗄️  Database queries: ${results.performanceMetrics.dbQueries}`);
    console.log(`  📊 Avg query time: ${results.performanceMetrics.avgQueryTime}ms`);
    
    console.log('='.repeat(60));
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  let fullAudit = false;
  let missingOnly = false;
  let movieId = null;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--full-audit':
        fullAudit = true;
        break;
      case '--missing-only':
        missingOnly = true;
        break;
      case '--movie-id':
        movieId = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }
  
  const validator = new DatabaseStorageValidator();
  
  try {
    const results = await validator.executeValidation({ fullAudit, missingOnly, movieId });
    
    console.log('\n✅ Storage validation completed successfully!');
    
    if (results.contentIssues.length > 0) {
      console.log('⚠️  Issues detected - see report above for details');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Storage validation failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Database Storage Validator

Usage:
  node scripts/database-storage-validator.js [options]

Options:
  --full-audit       Perform comprehensive audit including structure validation
  --missing-only     Focus only on missing content detection
  --movie-id <id>    Validate specific movie by ID
  --help             Show this help

Examples:
  # Standard validation
  node scripts/database-storage-validator.js
  
  # Full comprehensive audit
  node scripts/database-storage-validator.js --full-audit
  
  # Check missing content only
  node scripts/database-storage-validator.js --missing-only
  
  # Validate specific movie
  node scripts/database-storage-validator.js --movie-id 12345
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

export { DatabaseStorageValidator };