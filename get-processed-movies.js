#!/usr/bin/env node

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getProcessedMovies() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });
  await client.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        m.title,
        m.year,
        m.tmdb_id,
        ma.link_count
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.has_links = true
      AND ma.query_text = 'Batch regenerated analysis'
      ORDER BY ma.link_count DESC
      LIMIT 10
    `);
    
    console.log('🔗 Movies that actually have processed links:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title} (${row.year}) - TMDB ${row.tmdb_id} - ${row.link_count} links`);
      console.log(`   Test URL: http://localhost:3001/movie/${row.tmdb_id}`);
    });
    
  } finally {
    await client.end();
  }
}

getProcessedMovies().catch(console.error);