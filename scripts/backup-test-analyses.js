#!/usr/bin/env node

/**
 * Backup Test Analyses Utility
 * Creates backups of existing analyses for safe testing
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test TMDB IDs from PROMPT_C3_Test_LIST.txt
const TEST_TMDB_IDS = [963, 599, 10020]; // Lines 1, 5, 43

async function backupTestAnalyses() {
  console.log('🔄 Starting backup of test analyses...');
  
  // Get movies for these TMDB IDs
  const { data: movies, error: moviesError } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id')
    .in('tmdb_id', TEST_TMDB_IDS);

  if (moviesError) {
    throw new Error(`Error fetching movies: ${moviesError.message}`);
  }

  console.log(`📋 Found ${movies.length} test movies`);
  
  const backupData = {
    timestamp: new Date().toISOString(),
    movies: [],
    analyses: []
  };

  // Backup each movie and its analyses
  for (const movie of movies) {
    console.log(`💾 Backing up ${movie.title} (${movie.year}) - TMDB ${movie.tmdb_id}`);
    
    backupData.movies.push(movie);

    // Get existing analyses
    const { data: analyses, error: analysesError } = await supabase
      .from('movie_analyses')
      .select('*')
      .eq('movie_id', movie.id);

    if (analysesError) {
      console.warn(`⚠️ Error fetching analyses for ${movie.title}: ${analysesError.message}`);
      continue;
    }

    if (analyses && analyses.length > 0) {
      console.log(`  📊 Found ${analyses.length} existing analyses`);
      backupData.analyses.push(...analyses);
    } else {
      console.log(`  ✨ No existing analyses found`);
    }
  }

  // Save backup file
  const backupFile = `./test-analyses-backup-${Date.now()}.json`;
  writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`✅ Backup complete!`);
  console.log(`📁 Backup saved to: ${backupFile}`);
  console.log(`📊 Summary: ${backupData.movies.length} movies, ${backupData.analyses.length} analyses backed up`);
  
  return backupFile;
}

async function main() {
  try {
    await backupTestAnalyses();
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

main();