#!/usr/bin/env node

/**
 * Check Contributors Status
 * 
 * Investigates the current state of contributor data across all tables
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

async function checkStatus() {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('🔍 Checking contributor data status...\n');
    
    // 1. Check movie_contributors table
    const mcStats = await client.query(`
      SELECT COUNT(*) as total_records,
             COUNT(DISTINCT movie_tmdb_id) as unique_movies,
             COUNT(DISTINCT person_name) as unique_people,
             COUNT(person_id) as records_with_person_id
      FROM movie_contributors
    `);
    
    console.log('📋 movie_contributors table:');
    const mc = mcStats.rows[0];
    console.log(`   - Total records: ${mc.total_records}`);
    console.log(`   - Unique movies: ${mc.unique_movies}`);
    console.log(`   - Unique people: ${mc.unique_people}`);
    console.log(`   - Records with person_id: ${mc.records_with_person_id}`);
    
    // 2. Check movies.contributors_json status  
    const movieStats = await client.query(`
      SELECT 
        COUNT(*) as total_movies,
        COUNT(contributors_json) as has_contributors_json,
        SUM(CASE WHEN contributors_json = '[]'::jsonb THEN 1 ELSE 0 END) as empty_contributors_json,
        SUM(CASE WHEN contributors_json IS NOT NULL AND contributors_json != '[]'::jsonb THEN 1 ELSE 0 END) as populated_contributors_json
      FROM movies
    `);
    
    console.log('\n🎬 movies.contributors_json status:');
    const ms = movieStats.rows[0];
    console.log(`   - Total movies: ${ms.total_movies}`);
    console.log(`   - Has contributors_json: ${ms.has_contributors_json}`);
    console.log(`   - Empty contributors_json: ${ms.empty_contributors_json}`);
    console.log(`   - Populated contributors_json: ${ms.populated_contributors_json}`);
    
    // 3. Check overlap - movies in movie_contributors but not in movies.contributors_json
    const overlapResult = await client.query(`
      SELECT COUNT(DISTINCT mc.movie_tmdb_id) as movies_in_mc_table,
             COUNT(DISTINCT CASE WHEN m.contributors_json IS NOT NULL AND m.contributors_json != '[]'::jsonb THEN mc.movie_tmdb_id END) as movies_with_json
      FROM movie_contributors mc
      LEFT JOIN movies m ON m.tmdb_id = mc.movie_tmdb_id
    `);
    
    console.log('\n🔄 Data pipeline overlap:');
    const or = overlapResult.rows[0];
    console.log(`   - Movies in movie_contributors: ${or.movies_in_mc_table}`);
    console.log(`   - Of those, have contributors_json: ${or.movies_with_json}`);
    console.log(`   - Missing contributors_json: ${or.movies_in_mc_table - or.movies_with_json}`);
    
    // 4. Sample contributors_json format
    const sampleResult = await client.query(`
      SELECT tmdb_id, title, contributors_json
      FROM movies
      WHERE contributors_json IS NOT NULL 
      AND contributors_json != '[]'::jsonb
      AND jsonb_typeof(contributors_json) = 'array'
      LIMIT 3
    `);
    
    console.log('\n📄 Sample contributors_json formats:');
    sampleResult.rows.forEach((movie, index) => {
      console.log(`\n   ${index + 1}. ${movie.title} (${movie.tmdb_id}):`);
      const contributors = JSON.parse(movie.contributors_json);
      console.log(`      Type: ${typeof contributors}, Length: ${contributors.length}`);
      if (contributors.length > 0) {
        console.log(`      First contributor:`, JSON.stringify(contributors[0], null, 8));
      }
    });
    
    // 5. Check if any movies need processing
    const needProcessingResult = await client.query(`
      SELECT COUNT(DISTINCT m.tmdb_id) as needs_processing
      FROM movies m
      JOIN movie_contributors mc ON mc.movie_tmdb_id = m.tmdb_id
      WHERE m.contributors_json IS NULL OR m.contributors_json = '[]'::jsonb
    `);
    
    console.log(`\n🚨 Movies needing contributors_json population: ${needProcessingResult.rows[0].needs_processing}`);
    
    if (needProcessingResult.rows[0].needs_processing > 0) {
      // Show sample movies that need processing
      const samplesResult = await client.query(`
        SELECT DISTINCT m.tmdb_id, m.title, m.year,
               COUNT(mc.person_name) as contributor_count
        FROM movies m
        JOIN movie_contributors mc ON mc.movie_tmdb_id = m.tmdb_id
        WHERE m.contributors_json IS NULL OR m.contributors_json = '[]'::jsonb
        GROUP BY m.tmdb_id, m.title, m.year
        ORDER BY contributor_count DESC
        LIMIT 5
      `);
      
      console.log('\n📋 Sample movies needing processing:');
      samplesResult.rows.forEach((movie, index) => {
        console.log(`   ${index + 1}. ${movie.title} (${movie.year}) - ${movie.contributor_count} contributors`);
      });
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  } finally {
    await client.end();
  }
}

checkStatus().catch(console.error);