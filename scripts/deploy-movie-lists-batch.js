#!/usr/bin/env node

/**
 * More efficient batch deployment of movie lists
 * Uses batch inserts and optimized queries
 */

import { getPool } from '../lib/railway-db.js';
import fs from 'fs';

async function deployMovieListsBatch() {
  console.log('🚀 Batch deploying generated movie lists...');
  
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Load data
    const aggregatedPath = './generated-lists-batch/aggregated-lists.json';
    const aggregatedData = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
    const validLists = aggregatedData.validLists || [];
    
    console.log(`📊 Deploying ${validLists.length} lists`);
    
    // Pre-load movie UUID mapping for efficiency
    console.log('🔍 Loading movie UUID mappings...');
    const movieMappingResult = await client.query('SELECT id, tmdb_id FROM movies');
    const tmdbToUuid = {};
    movieMappingResult.rows.forEach(row => {
      tmdbToUuid[row.tmdb_id] = row.id;
    });
    console.log(`📋 Loaded ${Object.keys(tmdbToUuid).length} movie mappings`);
    
    await client.query('BEGIN');
    
    // Clear existing data
    await client.query('DELETE FROM movie_list_memberships');
    await client.query('DELETE FROM movie_lists');
    
    // Batch insert lists
    console.log('📝 Inserting lists...');
    const listValues = validLists.map(list => [
      list.listName,
      list.description || `${list.category} themed movie list`,
      list.movies.length,
      true // use_flag
    ]);
    
    const placeholders = listValues.map((_, i) => {
      const base = i * 4;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    }).join(', ');
    
    const flatValues = listValues.flat();
    
    const listInsertResult = await client.query(`
      INSERT INTO movie_lists (name, description, movie_count, use_flag)
      VALUES ${placeholders}
      RETURNING id, name
    `, flatValues);
    
    console.log(`✅ Inserted ${listInsertResult.rows.length} lists`);
    
    // Create list ID mapping
    const listIdMapping = {};
    listInsertResult.rows.forEach((row, index) => {
      listIdMapping[index] = row.id;
    });
    
    // Batch insert memberships
    console.log('🔗 Inserting movie memberships...');
    const membershipValues = [];
    let skippedMovies = 0;
    
    validLists.forEach((list, listIndex) => {
      const listId = listIdMapping[listIndex];
      
      list.movies.forEach(movie => {
        const movieUuid = tmdbToUuid[movie.tmdbId];
        if (movieUuid) {
          membershipValues.push([
            movieUuid,
            listId,
            movie.connectionReason || 'AI-identified thematic connection'
          ]);
        } else {
          skippedMovies++;
        }
      });
    });
    
    if (membershipValues.length > 0) {
      const membershipPlaceholders = membershipValues.map((_, i) => {
        const base = i * 3;
        return `($${base + 1}, $${base + 2}, $${base + 3})`;
      }).join(', ');
      
      const flatMembershipValues = membershipValues.flat();
      
      await client.query(`
        INSERT INTO movie_list_memberships (movie_id, list_id, connection_reason)
        VALUES ${membershipPlaceholders}
      `, flatMembershipValues);
    }
    
    await client.query('COMMIT');
    
    console.log(`🎉 Deployment complete!`);
    console.log(`  • Lists deployed: ${listInsertResult.rows.length}`);
    console.log(`  • Memberships created: ${membershipValues.length}`);
    console.log(`  • Movies not found: ${skippedMovies}`);
    console.log(`  • All lists enabled by default`);
    
    // Quick verification
    const verifyResult = await client.query(`
      SELECT COUNT(*) as lists, 
             COUNT(*) FILTER (WHERE use_flag = true) as active,
             SUM(movie_count) as total_memberships
      FROM movie_lists
    `);
    
    const stats = verifyResult.rows[0];
    console.log(`\n📊 Verification:`);
    console.log(`  • Total lists: ${stats.lists}`);
    console.log(`  • Active lists: ${stats.active}`);
    console.log(`  • Total movie slots: ${stats.total_memberships}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deployMovieListsBatch()
  .then(() => {
    console.log('\n✅ Batch deployment successful!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Batch deployment failed:', error.message);
    process.exit(1);
  });