#!/usr/bin/env node
/**
 * Get valid TMDB IDs from Railway database for static generation
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function getValidTmdbIds() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to Railway database');

    // First check table structure
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'movie_analyses'
      ORDER BY ordinal_position
    `;
    
    const schemaResult = await client.query(schemaQuery);
    console.log('Table structure:');
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Check movies table structure too
    const moviesSchemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'movies'
      ORDER BY ordinal_position
    `;
    
    const moviesSchemaResult = await client.query(moviesSchemaQuery);
    console.log('\nMovies table structure:');
    moviesSchemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Get TMDB IDs by joining movie_analyses with movies table
    const ranges = [
      { start: 1, end: 100 },
      { start: 150, end: 250 },
      { start: 500, end: 600 }
    ];
    
    const validIds = [];
    
    for (const range of ranges) {
      const query = `
        SELECT DISTINCT m.tmdb_id 
        FROM movie_analyses ma
        JOIN movies m ON ma.movie_id = m.id
        WHERE m.tmdb_id BETWEEN $1 AND $2 
        ORDER BY m.tmdb_id
      `;
      
      const result = await client.query(query, [range.start, range.end]);
      const rangeIds = result.rows.map(row => row.tmdb_id);
      
      console.log(`\nRange ${range.start}-${range.end}: ${rangeIds.length} valid IDs`);
      console.log(`  IDs: ${rangeIds.slice(0, 10).join(', ')}${rangeIds.length > 10 ? '...' : ''}`);
      
      validIds.push(...rangeIds);
    }
    
    console.log(`\nTotal valid IDs: ${validIds.length}`);
    console.log('\nJavaScript array for getStaticPaths:');
    console.log(`const movieIds = [${validIds.map(id => `'${id}'`).join(', ')}];`);
    
    return validIds;
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

getValidTmdbIds();