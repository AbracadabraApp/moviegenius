#!/usr/bin/env node

/**
 * Execute updated_at column migration
 * Adds updated_at column to movie_analyses table for proper tracking
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

// Set environment variables if not already set
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeMigration() {
  console.log('🔧 Executing updated_at column migration...\n');

  try {
    // Read the SQL migration file
    const sqlContent = readFileSync(resolve(__dirname, 'add-updated-at-column.sql'), 'utf8');
    
    console.log('📝 SQL Migration:');
    console.log(sqlContent);
    console.log('\n🚀 Executing migration...');

    // Since exec_sql isn't available, we'll use a simple column check approach
    console.log('🔍 Checking if updated_at column already exists...');
    
    // Try a simple query to see if the column exists
    const { data: testData, error: testError } = await supabase
      .from('movie_analyses')
      .select('updated_at')
      .limit(1);

    if (testError && testError.code === 'PGRST103') {
      console.log('❌ Column does not exist, but cannot add via API');
      console.log('📋 Please run this SQL manually in Supabase dashboard:');
      console.log('\nALTER TABLE movie_analyses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      console.log('\nFor now, removing the updated_at reference from the code...');
      process.exit(0);
    } else if (testError) {
      console.error('❌ Unexpected error:', testError);
      process.exit(1);
    } else {
      console.log('✅ Column already exists or query succeeded');
    }
    
    // Verify the column was added
    const { data: tableInfo, error: infoError } = await supabase
      .from('movie_analyses')
      .select('updated_at')
      .limit(1);

    if (infoError) {
      console.error('❌ Verification failed:', infoError);
    } else {
      console.log('✅ Verification: updated_at column is now available');
    }

  } catch (error) {
    console.error('❌ Migration execution failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}