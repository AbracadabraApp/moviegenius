#!/usr/bin/env node

/**
 * Deploy the generated movie lists to production database
 * Loads the aggregated lists and inserts them with proper use_flags
 */

import { getPool } from '../lib/railway-db.js';
import fs from 'fs';

async function deployMovieLists() {
  console.log('🚀 Deploying generated movie lists to production database...');
  
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Load the aggregated results
    const aggregatedPath = './generated-lists-batch/aggregated-lists.json';
    if (!fs.existsSync(aggregatedPath)) {
      throw new Error(`Aggregated lists file not found: ${aggregatedPath}`);
    }
    
    const aggregatedData = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
    const validLists = aggregatedData.validLists || [];
    
    console.log(`📊 Found ${validLists.length} valid lists to deploy`);
    
    if (validLists.length === 0) {
      console.log('❌ No valid lists to deploy');
      return;
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    console.log('🗄️ Clearing existing movie lists...');
    await client.query('DELETE FROM movie_list_memberships');
    await client.query('DELETE FROM movie_lists');
    
    // Insert each list
    let insertedLists = 0;
    let insertedMemberships = 0;
    
    for (const list of validLists) {
      try {
        // Insert the list with use_flag = true by default
        const listResult = await client.query(`
          INSERT INTO movie_lists (name, description, movie_count, use_flag, created_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          RETURNING id
        `, [
          list.listName,
          list.description || `${list.category} themed movie list`,
          list.movies.length,
          true  // All lists start as enabled
        ]);
        
        const listId = listResult.rows[0].id;
        insertedLists++;
        
        // Insert memberships for each movie in the list
        for (const movie of list.movies) {
          // Find the movie UUID from tmdbId
          const movieResult = await client.query(`
            SELECT id FROM movies WHERE tmdb_id = $1 LIMIT 1
          `, [movie.tmdbId]);
          
          if (movieResult.rows.length > 0) {
            const movieUuid = movieResult.rows[0].id;
            
            await client.query(`
              INSERT INTO movie_list_memberships (movie_id, list_id, connection_reason)
              VALUES ($1, $2, $3)
            `, [
              movieUuid,
              listId,
              movie.connectionReason || 'Thematic connection identified by AI analysis'
            ]);
            
            insertedMemberships++;
          } else {
            console.warn(`⚠️ Movie not found in database: TMDB ID ${movie.tmdbId}`);
          }
        }
        
        if (insertedLists % 50 === 0) {
          console.log(`📋 Inserted ${insertedLists} lists...`);
        }
        
      } catch (listError) {
        console.warn(`⚠️ Failed to insert list "${list.listName}": ${listError.message}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✅ Successfully deployed movie lists:`);
    console.log(`  • Lists inserted: ${insertedLists}`);
    console.log(`  • Memberships inserted: ${insertedMemberships}`);
    console.log(`  • All lists enabled by default (use_flag = true)`);
    
    // Show sample of deployed lists
    const sampleResult = await client.query(`
      SELECT name, movie_count, use_flag, created_at
      FROM movie_lists 
      ORDER BY movie_count DESC 
      LIMIT 10
    `);
    
    console.log('\n🎬 Top 10 deployed lists:');
    sampleResult.rows.forEach((row, index) => {
      const date = row.created_at.toDateString();
      console.log(`${index + 1}. "${row.name}" (${row.movie_count} movies) - ${date}`);
    });
    
    console.log(`\n🎉 Movie lists deployment complete!`);
    console.log(`Use scripts/manage-list-flags.js to manage use/don't use flags`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to deploy movie lists:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the deployment
deployMovieLists()
  .then(() => {
    console.log('\n✅ Deployment successful!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  });