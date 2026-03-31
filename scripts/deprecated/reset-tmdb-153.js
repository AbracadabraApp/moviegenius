#!/usr/bin/env node
/**
 * Reset TMDB 153 to test the double-escaping fix
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function resetTMDB153() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    
    // Reset has_links and link_count for TMDB 153
    const result = await client.query(`
      UPDATE movie_analyses 
      SET has_links = false, link_count = 0
      FROM movies m 
      WHERE movie_analyses.movie_id = m.id 
        AND m.tmdb_id = 153
    `);
    
    console.log(`✅ Reset ${result.rowCount} analyses for TMDB 153`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetTMDB153().catch(console.error);