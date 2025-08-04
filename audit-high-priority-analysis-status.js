#!/usr/bin/env node
/**
 * High-Priority Movie Analysis Status Audit
 * 
 * Audits the specific high-priority movies mentioned in the January 2025 analysis gaps report
 * to determine the current discrepancy between nuclear static files and database metadata.
 * 
 * Key Investigation:
 * - Do nuclear static files exist with hasAnalysis: true?
 * - Does the database has_analysis column show false?
 * - What's the current state of movie_analyses table for these movies?
 * 
 * Usage: node audit-high-priority-analysis-status.js
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for nuclear static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// High-priority movies from January 2025 gaps report
const HIGH_PRIORITY_MOVIES = [
  { title: "Star Wars", tmdb_id: 11, expected_id: null },
  { title: "Citizen Kane", tmdb_id: 15, expected_id: null },
  { title: "2001: A Space Odyssey", tmdb_id: 62, expected_id: null },
  { title: "Apocalypse Now", tmdb_id: 28, expected_id: null },
  { title: "Forrest Gump", tmdb_id: 13, expected_id: null },
  { title: "Finding Nemo", tmdb_id: 12, expected_id: null },
  { title: "American Beauty", tmdb_id: 14, expected_id: null },
  { title: "Eternal Sunshine of the Spotless Mind", tmdb_id: 38, expected_id: null }
];

class HighPriorityAnalysisAuditor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      movies: [],
      summary: {
        total_movies: HIGH_PRIORITY_MOVIES.length,
        nuclear_files_exist: 0,
        nuclear_has_analysis_true: 0,
        db_has_analysis_true: 0,
        db_analysis_records: 0,
        discrepancies: 0
      },
      discrepancies: [],
      recommendations: []
    };
  }

  async auditHighPriorityMovies() {
    console.log('🎬 High-Priority Movie Analysis Status Audit');
    console.log('============================================');
    console.log(`Timestamp: ${new Date().toLocaleString()}`);
    console.log(`Auditing ${HIGH_PRIORITY_MOVIES.length} movies from January 2025 gaps report\n`);

    for (const movie of HIGH_PRIORITY_MOVIES) {
      await this.auditSingleMovie(movie);
    }

    this.generateSummary();
    this.generateRecommendations();
    this.displayResults();
  }

  async auditSingleMovie(movie) {
    console.log(`🔍 Auditing: ${movie.title} (TMDB: ${movie.tmdb_id})`);
    
    const movieResult = {
      title: movie.title,
      tmdb_id: movie.tmdb_id,
      nuclear_file_exists: false,
      nuclear_has_analysis: null,
      nuclear_file_size: null,
      nuclear_sections_count: null,
      db_movie_id: null,
      db_has_analysis: null,
      db_analysis_count: 0,
      db_analysis_types: [],
      status: 'unknown',
      discrepancy: false,
      discrepancy_details: []
    };

    try {
      // 1. Get database movie record by TMDB ID
      const { data: dbMovie, error: movieError } = await supabase
        .from('movies')
        .select('id, title, year, has_analysis, tmdb_id')
        .eq('tmdb_id', movie.tmdb_id)
        .single();

      if (movieError) {
        console.log(`   ❌ Database error: ${movieError.message}`);
        movieResult.status = 'db_error';
        this.results.movies.push(movieResult);
        return;
      }

      if (!dbMovie) {
        console.log(`   ❌ Movie not found in database`);
        movieResult.status = 'not_found';
        this.results.movies.push(movieResult);
        return;
      }

      movieResult.db_movie_id = dbMovie.id;
      movieResult.db_has_analysis = dbMovie.has_analysis;
      console.log(`   📊 Database: ID=${dbMovie.id}, has_analysis=${dbMovie.has_analysis}`);

      // 2. Check nuclear static file
      const nuclearFilePath = join(__dirname, 'public', 'nuclear-static', `${dbMovie.id}.json`);
      movieResult.nuclear_file_exists = existsSync(nuclearFilePath);

      if (movieResult.nuclear_file_exists) {
        try {
          const nuclearContent = JSON.parse(readFileSync(nuclearFilePath, 'utf8'));
          movieResult.nuclear_has_analysis = nuclearContent.props?.hasAnalysis || false;
          movieResult.nuclear_sections_count = nuclearContent.props?.sections?.length || 0;
          movieResult.nuclear_file_size = readFileSync(nuclearFilePath).length;
          
          console.log(`   📄 Nuclear file: exists, hasAnalysis=${movieResult.nuclear_has_analysis}, sections=${movieResult.nuclear_sections_count}, size=${(movieResult.nuclear_file_size/1024).toFixed(1)}KB`);
        } catch (parseError) {
          console.log(`   ⚠️  Nuclear file exists but parse error: ${parseError.message}`);
          movieResult.nuclear_has_analysis = null;
        }
      } else {
        console.log(`   📄 Nuclear file: not found`);
      }

      // 3. Check movie_analyses table
      const { data: analyses, error: analysisError } = await supabase
        .from('movie_analyses')
        .select('id, analysis_type, created_at')
        .eq('movie_id', dbMovie.id);

      if (analysisError) {
        console.log(`   ❌ Analysis query error: ${analysisError.message}`);
      } else {
        movieResult.db_analysis_count = analyses?.length || 0;
        movieResult.db_analysis_types = analyses?.map(a => a.analysis_type) || [];
        console.log(`   🔬 Analysis records: ${movieResult.db_analysis_count} (types: ${movieResult.db_analysis_types.join(', ') || 'none'})`);
      }

      // 4. Determine status and discrepancies
      this.analyzeMovieStatus(movieResult);

    } catch (error) {
      console.log(`   💥 Unexpected error: ${error.message}`);
      movieResult.status = 'error';
    }

    this.results.movies.push(movieResult);
    console.log(`   ✅ Status: ${movieResult.status}${movieResult.discrepancy ? ' (DISCREPANCY)' : ''}\n`);
  }

  analyzeMovieStatus(movie) {
    const hasNuclearAnalysis = movie.nuclear_has_analysis === true;
    const hasDbFlag = movie.db_has_analysis === true;
    const hasDbRecords = movie.db_analysis_count > 0;

    // Determine primary status
    if (hasNuclearAnalysis && hasDbFlag && hasDbRecords) {
      movie.status = 'fully_analyzed';
    } else if (hasNuclearAnalysis && !hasDbFlag) {
      movie.status = 'nuclear_only';
      movie.discrepancy = true;
      movie.discrepancy_details.push('Nuclear file shows analysis but database has_analysis=false');
    } else if (hasNuclearAnalysis && !hasDbRecords) {
      movie.status = 'nuclear_no_db_records';
      movie.discrepancy = true;
      movie.discrepancy_details.push('Nuclear file shows analysis but no database records');
    } else if (hasDbFlag && !hasNuclearAnalysis) {
      movie.status = 'db_flag_no_nuclear';
      movie.discrepancy = true;
      movie.discrepancy_details.push('Database has_analysis=true but no nuclear file or nuclear shows false');
    } else if (hasDbRecords && !hasNuclearAnalysis) {
      movie.status = 'db_records_no_nuclear';
      movie.discrepancy = true;
      movie.discrepancy_details.push('Database has analysis records but no nuclear file or nuclear shows false');
    } else if (!hasNuclearAnalysis && !hasDbFlag && !hasDbRecords) {
      movie.status = 'no_analysis';
    } else {
      movie.status = 'partial_analysis';
      movie.discrepancy = true;
      movie.discrepancy_details.push('Mixed signals between nuclear file, database flag, and records');
    }

    // Track discrepancies
    if (movie.discrepancy) {
      this.results.discrepancies.push({
        title: movie.title,
        tmdb_id: movie.tmdb_id,
        movie_id: movie.db_movie_id,
        status: movie.status,
        details: movie.discrepancy_details
      });
    }
  }

  generateSummary() {
    const movies = this.results.movies;
    
    this.results.summary.nuclear_files_exist = movies.filter(m => m.nuclear_file_exists).length;
    this.results.summary.nuclear_has_analysis_true = movies.filter(m => m.nuclear_has_analysis === true).length;
    this.results.summary.db_has_analysis_true = movies.filter(m => m.db_has_analysis === true).length;
    this.results.summary.db_analysis_records = movies.filter(m => m.db_analysis_count > 0).length;
    this.results.summary.discrepancies = movies.filter(m => m.discrepancy).length;

    // Status breakdown
    this.results.summary.status_breakdown = {};
    movies.forEach(movie => {
      this.results.summary.status_breakdown[movie.status] = 
        (this.results.summary.status_breakdown[movie.status] || 0) + 1;
    });
  }

  generateRecommendations() {
    const discrepancies = this.results.discrepancies;
    const recommendations = [];

    // Nuclear files exist but database flags are wrong
    const nuclearOnlyMovies = this.results.movies.filter(m => m.status === 'nuclear_only');
    if (nuclearOnlyMovies.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Update database has_analysis flags',
        details: `${nuclearOnlyMovies.length} movies have nuclear analysis but database has_analysis=false`,
        movie_ids: nuclearOnlyMovies.map(m => m.db_movie_id),
        sql_command: `UPDATE movies SET has_analysis = true WHERE id IN (${nuclearOnlyMovies.map(m => m.db_movie_id).join(', ')});`
      });
    }

    // Movies with no analysis at all
    const noAnalysisMovies = this.results.movies.filter(m => m.status === 'no_analysis');
    if (noAnalysisMovies.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Generate analysis for missing movies',
        details: `${noAnalysisMovies.length} high-priority movies have no analysis`,
        movie_ids: noAnalysisMovies.map(m => m.db_movie_id),
        estimated_cost: `$${(noAnalysisMovies.length * 0.015).toFixed(2)}`
      });
    }

    // Database inconsistencies
    if (discrepancies.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Investigate and fix database inconsistencies',
        details: `${discrepancies.length} movies have mismatched analysis status across systems`,
        affected_movies: discrepancies.map(d => d.title)
      });
    }

    this.results.recommendations = recommendations;
  }

  displayResults() {
    console.log('📊 AUDIT RESULTS SUMMARY');
    console.log('========================');
    console.log(`• Total high-priority movies: ${this.results.summary.total_movies}`);
    console.log(`• Nuclear files exist: ${this.results.summary.nuclear_files_exist}`);
    console.log(`• Nuclear files with hasAnalysis=true: ${this.results.summary.nuclear_has_analysis_true}`);
    console.log(`• Database has_analysis=true: ${this.results.summary.db_has_analysis_true}`);
    console.log(`• Movies with DB analysis records: ${this.results.summary.db_analysis_records}`);
    console.log(`• Status discrepancies found: ${this.results.summary.discrepancies}`);

    if (Object.keys(this.results.summary.status_breakdown).length > 0) {
      console.log('\n📈 Status Breakdown:');
      Object.entries(this.results.summary.status_breakdown).forEach(([status, count]) => {
        console.log(`   • ${status}: ${count}`);
      });
    }

    if (this.results.discrepancies.length > 0) {
      console.log('\n⚠️  DISCREPANCIES DETECTED:');
      this.results.discrepancies.forEach((disc, index) => {
        console.log(`${index + 1}. ${disc.title} (TMDB: ${disc.tmdb_id})`);
        console.log(`   Status: ${disc.status}`);
        disc.details.forEach(detail => {
          console.log(`   • ${detail}`);
        });
        console.log('');
      });
    }

    if (this.results.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   ${rec.details}`);
        if (rec.sql_command) {
          console.log(`   SQL: ${rec.sql_command}`);
        }
        if (rec.estimated_cost) {
          console.log(`   Estimated cost: ${rec.estimated_cost}`);
        }
        console.log('');
      });
    }

    // Key findings
    console.log('🔍 KEY FINDINGS:');
    
    if (this.results.summary.nuclear_has_analysis_true > this.results.summary.db_has_analysis_true) {
      console.log(`• ❗ MISMATCH: ${this.results.summary.nuclear_has_analysis_true} movies have nuclear analysis but only ${this.results.summary.db_has_analysis_true} have database flag set`);
      console.log('• This suggests the analysis content EXISTS but the database metadata is outdated');
    }
    
    if (this.results.summary.nuclear_files_exist === this.results.summary.total_movies) {
      console.log('• ✅ All high-priority movies have nuclear static files');
    }
    
    if (this.results.summary.nuclear_has_analysis_true === this.results.summary.total_movies) {
      console.log('• ✅ All nuclear files show hasAnalysis=true - content appears complete!');
      console.log('• 🎯 CONCLUSION: We have analysis content, just need to fix database flags');
    } else {
      console.log(`• ⚠️  Only ${this.results.summary.nuclear_has_analysis_true}/${this.results.summary.total_movies} nuclear files show hasAnalysis=true`);
    }
  }
}

// Execute the audit
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new HighPriorityAnalysisAuditor();
  
  auditor.auditHighPriorityMovies()
    .then(() => {
      console.log('\n✅ High-priority analysis audit completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Audit failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { HighPriorityAnalysisAuditor };