#!/usr/bin/env node

/**
 * Populate Contributors JSON 
 * 
 * Final step of contributor pipeline: Creates movies.contributors_json from 
 * movie_contributors table with person ID lookups.
 * 
 * Pipeline: Analysis → movie_contributors → persons → movies.contributors_json
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

async function populateContributorsJson(limit = null, offset = 0) {
  const client = getRailwayClient();
  
  try {
    console.log('🔄 Connecting to Railway database...');
    await client.connect();
    
    // Get count of movies that have contributors but no contributors_json
    const countResult = await client.query(`
      SELECT COUNT(DISTINCT m.tmdb_id) as total
      FROM movies m
      JOIN movie_contributors mc ON mc.movie_tmdb_id = m.tmdb_id
      WHERE (m.contributors_json IS NULL OR m.contributors_json = '[]'::jsonb)
    `);
    
    const totalMovies = parseInt(countResult.rows[0].total);
    console.log(`📊 Movies with contributors but no contributors_json: ${totalMovies}`);
    
    // Build query to get movies with their contributors
    let query = `
      SELECT 
        m.tmdb_id,
        m.title,
        m.year,
        COALESCE(
          json_agg(
            json_build_object(
              'personId', COALESCE(mc.person_id, null),
              'personName', mc.person_name,
              'role', mc.role
            )
            ORDER BY 
              CASE mc.role 
                WHEN 'director' THEN 1
                WHEN 'writer' THEN 2  
                WHEN 'star' THEN 3
                WHEN 'cinematographer' THEN 4
                WHEN 'composer' THEN 5
                ELSE 6
              END,
              mc.person_name
          ) FILTER (WHERE mc.person_name IS NOT NULL),
          '[]'::json
        ) as contributors_data
      FROM movies m
      JOIN movie_contributors mc ON mc.movie_tmdb_id = m.tmdb_id
      WHERE (m.contributors_json IS NULL OR m.contributors_json = '[]'::jsonb)
      GROUP BY m.tmdb_id, m.title, m.year
      ORDER BY m.tmdb_id
    `;
    
    const params = [];
    if (offset > 0) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }
    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }
    
    console.log(`📋 Fetching movies (offset: ${offset}, limit: ${limit || 'all'})...`);
    const moviesResult = await client.query(query, params);
    
    console.log(`🎬 Processing ${moviesResult.rows.length} movies`);
    
    let processedMovies = 0;
    let errorCount = 0;
    let totalContributors = 0;
    
    for (const movie of moviesResult.rows) {
      try {
        console.log(`\n🎥 Processing: ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
        
        const contributorsData = movie.contributors_data;
        const contributorCount = Array.isArray(contributorsData) ? contributorsData.length : 0;
        
        console.log(`   👥 Found ${contributorCount} contributors`);
        
        // Update the movie with contributors_json
        await client.query(`
          UPDATE movies 
          SET contributors_json = $1::jsonb
          WHERE tmdb_id = $2
        `, [JSON.stringify(contributorsData), movie.tmdb_id]);
        
        // Log some contributor details
        if (contributorCount > 0) {
          contributorsData.slice(0, 3).forEach(contributor => {
            const personInfo = contributor.personId 
              ? `ID: ${contributor.personId}` 
              : 'No ID';
            console.log(`     - ${contributor.personName} (${contributor.role}) [${personInfo}]`);
          });
          if (contributorCount > 3) {
            console.log(`     ... and ${contributorCount - 3} more`);
          }
        }
        
        totalContributors += contributorCount;
        processedMovies++;
        
        // Progress update every 25 movies
        if (processedMovies % 25 === 0) {
          console.log(`\n📊 Progress: ${processedMovies}/${moviesResult.rows.length} movies, ${totalContributors} total contributors`);
        }
        
      } catch (updateError) {
        console.error(`❌ Failed to update ${movie.title}:`, updateError.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n🎉 Contributors JSON population completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Movies processed: ${processedMovies}`);
    console.log(`   - Contributors added: ${totalContributors}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // Database stats
    await printFinalStats(client);
    
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function printFinalStats(client) {
  // Count movies with contributors_json now
  const statsResult = await client.query(`
    SELECT 
      COUNT(*) as total_movies,
      COUNT(contributors_json) as movies_with_json,
      COUNT(*) - COUNT(contributors_json) as movies_without_json
    FROM movies
  `);
  
  console.log('\n📈 Final Database Statistics:');
  const stats = statsResult.rows[0];
  console.log(`   - Total movies: ${stats.total_movies}`);
  console.log(`   - Movies with contributors_json: ${stats.movies_with_json}`);
  console.log(`   - Movies without contributors_json: ${stats.movies_without_json}`);
  
  // Sample of populated contributors_json
  const sampleResult = await client.query(`
    SELECT 
      tmdb_id,
      title,
      CASE 
        WHEN jsonb_typeof(contributors_json) = 'array' 
        THEN jsonb_array_length(contributors_json) 
        ELSE 0 
      END as contributor_count
    FROM movies
    WHERE contributors_json IS NOT NULL 
    AND contributors_json != '[]'::jsonb
    AND jsonb_typeof(contributors_json) = 'array'
    ORDER BY 
      CASE 
        WHEN jsonb_typeof(contributors_json) = 'array' 
        THEN jsonb_array_length(contributors_json) 
        ELSE 0 
      END DESC
    LIMIT 5
  `);
  
  console.log('\n🌟 Top Movies by Contributor Count:');
  sampleResult.rows.forEach((movie, index) => {
    console.log(`   ${index + 1}. ${movie.title} (${movie.tmdb_id}): ${movie.contributor_count} contributors`);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const offsetArg = args.find(arg => arg.startsWith('--offset='));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const offset = offsetArg ? parseInt(offsetArg.split('=')[1]) : 0;

// Execute population if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateContributorsJson(limit, offset).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { populateContributorsJson };