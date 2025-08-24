#!/usr/bin/env node

/**
 * Find Ted Lasso movie ID for testing
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  return new Client({ connectionString: dbUrl });
}

async function findTedLasso() {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT tmdb_id, title, year
      FROM movies 
      WHERE title ILIKE '%Ted Lasso%'
      LIMIT 3
    `);
    
    console.log('Ted Lasso movies:');
    result.rows.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
      console.log(`   URL: http://localhost:3001/movie/${movie.tmdb_id}`);
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  } finally {
    await client.end();
  }
}

findTedLasso().catch(console.error);