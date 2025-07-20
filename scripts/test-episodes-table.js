#!/usr/bin/env node

/**
 * Test Episodes Table Script
 *
 * Tests if the episodes table exists and can be queried.
 */

import { EpisodeService } from '../lib/supabase.js';

async function testEpisodesTable() {
  try {
    console.log('🔍 Testing episodes table...');

    // Try to get any episode
    const result = await EpisodeService.getEpisode(1, 1, 1);

    if (result) {
      console.log('✅ Episodes table exists and has data!');
      console.log('📊 Sample episode:', result.title);
    } else {
      console.log('📝 Episodes table exists but no episode 1-1-1 found');
    }

    // Try to get all episodes to see current count
    const allEpisodes = await EpisodeService.getAllEpisodes();
    if (allEpisodes) {
      console.log(`📊 Total episodes in database: ${allEpisodes.length}`);
    }
  } catch (error) {
    if (error.message.includes('relation "episodes" does not exist')) {
      console.log('❌ Episodes table does not exist yet');
      console.log('📝 You need to create it manually in Supabase dashboard:');
      console.log('   1. Go to Supabase SQL Editor');
      console.log('   2. Copy contents of scripts/episodes-schema.sql');
      console.log('   3. Run the SQL statements');
    } else {
      console.error('❌ Error testing episodes table:', error.message);
    }
  }
}

// Run the test
testEpisodesTable();
