#!/usr/bin/env node

/**
 * Database Integrity Check
 * Comprehensive verification of database state after regeneration
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseIntegrity() {
  console.log('🔍 Database Integrity Check');
  console.log('📊 Comprehensive verification after regeneration');
  console.log('');

  try {
    // 1. Basic counts
    console.log('📋 1. Basic Counts');
    
    const { count: totalMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    const { count: totalAnalyses } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis');

    console.log(`✅ Movies with TMDB data: ${totalMovies?.toLocaleString()}`);
    console.log(`✅ Total page analyses: ${totalAnalyses?.toLocaleString()}`);
    console.log('');

    // 2. Check for movies without TMDB (data integrity violation)
    console.log('📋 2. Data Integrity - TMDB Requirements');
    
    const { count: moviesWithoutTmdb } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('tmdb_id', null);

    if (moviesWithoutTmdb === 0) {
      console.log('✅ All movies have TMDB data (good)');
    } else {
      console.log(`⚠️  ${moviesWithoutTmdb} movies missing TMDB data (needs cleanup)`);
    }
    console.log('');

    // 3. Movies without analysis (should be minimal)
    console.log('📋 3. Analysis Coverage');
    
    const { data: allMoviesWithTmdb } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .not('tmdb_id', 'is', null)
      .limit(1000); // Sample check

    if (allMoviesWithTmdb) {
      const movieIds = allMoviesWithTmdb.map(m => m.id);
      const { data: existingAnalyses } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis')
        .in('movie_id', movieIds);

      const analyzedIds = new Set(existingAnalyses?.map(a => a.movie_id) || []);
      const missingAnalysis = allMoviesWithTmdb.filter(m => !analyzedIds.has(m.id));

      console.log(`📊 Sample check (first 1000 movies):`);
      console.log(`  ✅ With analysis: ${analyzedIds.size}/1000`);
      console.log(`  ⏳ Missing analysis: ${missingAnalysis.length}/1000`);
      
      if (missingAnalysis.length > 0) {
        console.log(`  📋 Sample missing:`);
        missingAnalysis.slice(0, 3).forEach((movie, i) => {
          console.log(`    ${i + 1}. ${movie.title} (${movie.year})`);
        });
      }
    }
    console.log('');

    // 4. Analysis content quality check
    console.log('📋 4. Analysis Content Quality');
    
    const { data: sampleAnalyses } = await supabase
      .from('movie_analyses')
      .select('claude_response, created_at')
      .eq('analysis_type', 'page_analysis')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sampleAnalyses) {
      let modernCount = 0;
      let legacyCount = 0;
      let batchCount = 0;

      sampleAnalyses.forEach(analysis => {
        const response = analysis.claude_response;
        if (response?.batch_generated) {
          batchCount++;
        }
        if (response?.raw_content?.includes('SUBHEAD') || response?.sections) {
          modernCount++;
        } else {
          legacyCount++;
        }
      });

      console.log(`  📊 Sample of 10 recent analyses:`);
      console.log(`    ✅ Modern format (with SUBHEADs): ${modernCount}/10`);
      console.log(`    ⚠️  Legacy format: ${legacyCount}/10`);
      console.log(`    🚀 Batch generated: ${batchCount}/10`);
    }
    console.log('');

    // 5. Check for duplicates
    console.log('📋 5. Duplicate Analysis Check');
    
    const { data: duplicateCheck } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis');

    if (duplicateCheck) {
      const movieIdCounts = {};
      duplicateCheck.forEach(analysis => {
        movieIdCounts[analysis.movie_id] = (movieIdCounts[analysis.movie_id] || 0) + 1;
      });

      const duplicates = Object.entries(movieIdCounts).filter(([id, count]) => count > 1);
      
      if (duplicates.length === 0) {
        console.log('✅ No duplicate analyses found (good)');
      } else {
        console.log(`⚠️  Found ${duplicates.length} movies with multiple analyses`);
        console.log(`  📋 Sample duplicates:`);
        duplicates.slice(0, 3).forEach(([movieId, count]) => {
          console.log(`    Movie ${movieId}: ${count} analyses`);
        });
      }
    }
    console.log('');

    // 6. Verify regenerated movies specifically
    console.log('📋 6. Regenerated Movies Verification');
    
    const movieIds = JSON.parse(readFileSync('./movie-ids-to-process.json', 'utf8'));
    console.log(`🎬 Checking all ${movieIds.length} regenerated movies...`);
    
    let regeneratedWithAnalysis = 0;
    let regeneratedBatchGenerated = 0;
    const batchSize = 100;
    
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      
      const { data: analyses } = await supabase
        .from('movie_analyses')
        .select('movie_id, claude_response')
        .eq('analysis_type', 'page_analysis')
        .in('movie_id', batch);
      
      regeneratedWithAnalysis += analyses?.length || 0;
      
      analyses?.forEach(analysis => {
        if (analysis.claude_response?.batch_generated) {
          regeneratedBatchGenerated++;
        }
      });
    }
    
    console.log(`  ✅ Have analysis: ${regeneratedWithAnalysis}/${movieIds.length}`);
    console.log(`  🚀 Batch generated: ${regeneratedBatchGenerated}/${movieIds.length}`);
    console.log('');

    // 7. Overall integrity assessment
    console.log('📋 7. Overall Integrity Assessment');
    
    const issues = [];
    
    if (moviesWithoutTmdb > 0) {
      issues.push(`${moviesWithoutTmdb} movies without TMDB data`);
    }
    
    if (regeneratedWithAnalysis < movieIds.length) {
      issues.push(`${movieIds.length - regeneratedWithAnalysis} regenerated movies still missing analysis`);
    }
    
    if (duplicates && duplicates.length > 0) {
      issues.push(`${duplicates.length} movies with duplicate analyses`);
    }

    if (issues.length === 0) {
      console.log('🎉 DATABASE INTEGRITY: EXCELLENT');
      console.log('✅ All integrity checks passed');
      console.log('✅ All regenerated analyses present');
      console.log('✅ No duplicates found');
      console.log('✅ Data consistency maintained');
    } else {
      console.log('⚠️  DATABASE INTEGRITY: ISSUES FOUND');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error('❌ Integrity check failed:', error.message);
  }
}

checkDatabaseIntegrity();