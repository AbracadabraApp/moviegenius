#!/usr/bin/env node

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getActualNumbers() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });
  await client.connect();
  
  try {
    console.log('📊 ACTUAL DATABASE NUMBERS:\n');
    
    // Total analyses in main table
    const mainTotal = await client.query(`
      SELECT COUNT(*) as count 
      FROM movie_analyses 
      WHERE query_text = 'Batch regenerated analysis'
    `);
    console.log(`Main table batch analyses: ${mainTotal.rows[0].count}`);
    
    // Analyses with links
    const withLinks = await client.query(`
      SELECT COUNT(*) as count 
      FROM movie_analyses 
      WHERE query_text = 'Batch regenerated analysis' 
      AND has_links = true
    `);
    console.log(`Analyses with links: ${withLinks.rows[0].count}`);
    
    // Analyses without links  
    const withoutLinks = await client.query(`
      SELECT COUNT(*) as count 
      FROM movie_analyses 
      WHERE query_text = 'Batch regenerated analysis' 
      AND (has_links IS NULL OR has_links = false)
    `);
    console.log(`Analyses without links: ${withoutLinks.rows[0].count}`);
    
    // Total movies
    const totalMovies = await client.query(`
      SELECT COUNT(*) as count 
      FROM movies 
      WHERE tmdb_id IS NOT NULL
    `);
    console.log(`Total movies in database: ${totalMovies.rows[0].count}`);
    
    // Alternative table count
    const altCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM not_prod_movie_analyses_alternatives
    `);
    console.log(`Alternative analyses: ${altCount.rows[0].count}`);
    
    console.log(`\n🔍 MATH CHECK:`);
    console.log(`With links + Without links = ${parseInt(withLinks.rows[0].count) + parseInt(withoutLinks.rows[0].count)}`);
    console.log(`Should equal main total: ${mainTotal.rows[0].count}`);
    
    const grandTotal = parseInt(mainTotal.rows[0].count) + parseInt(altCount.rows[0].count);
    console.log(`\nGrand total (main + alternatives): ${grandTotal}`);
    
  } finally {
    await client.end();
  }
}

getActualNumbers().catch(console.error);