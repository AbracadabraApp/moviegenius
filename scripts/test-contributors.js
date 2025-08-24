#!/usr/bin/env node

/**
 * Test Contributors System
 * 
 * Tests the contributors service and API on sample movies
 */

import 'dotenv/config';
import { getMovieContributors } from '../lib/services/contributors-service.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Test contributors for a sample movie
 */
async function testMovieContributors(tmdbId, title) {
  console.log(`\n🎬 Testing Contributors for: ${title} (${tmdbId})`);
  
  try {
    // Get movie ID from tmdbId
    const client = await pool.connect();
    const movieResult = await client.query(
      'SELECT id, title, year FROM movies WHERE tmdb_id = $1',
      [tmdbId]
    );
    client.release();
    
    if (movieResult.rows.length === 0) {
      console.log('❌ Movie not found in database');
      return null;
    }
    
    const movie = movieResult.rows[0];
    console.log(`📋 Movie: ${movie.title} (${movie.year})`);
    
    // Test contributors service
    const startTime = Date.now();
    const contributors = await getMovieContributors(movie.id, tmdbId);
    const processingTime = Date.now() - startTime;
    
    // Display results
    console.log(`✅ Retrieved contributors in ${processingTime}ms`);
    
    if (contributors.director) {
      const d = contributors.director;
      console.log(`   Director: ${d.name}${d.personId ? ` (ID: ${d.personId})` : ' (no person link)'}`);
    }
    
    if (contributors.stars && contributors.stars.length > 0) {
      console.log(`   Stars (${contributors.stars.length}):`);
      contributors.stars.slice(0, 3).forEach(star => {
        console.log(`     - ${star.name}${star.personId ? ` (ID: ${star.personId})` : ' (no link)'}`);
      });
    }
    
    if (contributors.writers && contributors.writers.length > 0) {
      console.log(`   Writers (${contributors.writers.length}):`);
      contributors.writers.slice(0, 2).forEach(writer => {
        console.log(`     - ${writer.name}${writer.personId ? ` (ID: ${writer.personId})` : ' (no link)'}`);
      });
    }
    
    if (contributors.cinematographer) {
      const c = contributors.cinematographer;
      console.log(`   Cinematographer: ${c.name}${c.personId ? ` (ID: ${c.personId})` : ' (no link)'}`);
    }
    
    if (contributors.composer) {
      const c = contributors.composer;
      console.log(`   Composer: ${c.name}${c.personId ? ` (ID: ${c.personId})` : ' (no link)'}`);
    }
    
    // Count linked vs unlinked contributors
    let linkedCount = 0;
    let totalCount = 0;
    
    if (contributors.director) {
      totalCount++;
      if (contributors.director.personId) linkedCount++;
    }
    
    totalCount += (contributors.stars || []).length;
    linkedCount += (contributors.stars || []).filter(s => s.personId).length;
    
    totalCount += (contributors.writers || []).length;
    linkedCount += (contributors.writers || []).filter(w => w.personId).length;
    
    if (contributors.cinematographer) {
      totalCount++;
      if (contributors.cinematographer.personId) linkedCount++;
    }
    
    if (contributors.composer) {
      totalCount++;
      if (contributors.composer.personId) linkedCount++;
    }
    
    console.log(`📊 Person Links: ${linkedCount}/${totalCount} (${((linkedCount/totalCount)*100).toFixed(1)}%)`);
    
    return {
      success: true,
      movie: movie.title,
      contributors,
      stats: {
        linkedCount,
        totalCount,
        linkPercentage: (linkedCount/totalCount)*100,
        processingTime
      }
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    return null;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Testing Contributors System');
  console.log('==============================');
  
  const testMovies = [
    { tmdbId: 550, title: "Fight Club" },
    { tmdbId: 11, title: "Star Wars" },
    { tmdbId: 680, title: "Pulp Fiction" },
    { tmdbId: 238, title: "The Godfather" },
    { tmdbId: 424, title: "Schindler's List" }
  ];
  
  try {
    let totalTests = 0;
    let successfulTests = 0;
    let totalLinked = 0;
    let totalContributors = 0;
    const results = [];
    
    // Test each movie
    for (const { tmdbId, title } of testMovies) {
      const result = await testMovieContributors(tmdbId, title);
      if (result) {
        results.push(result);
        successfulTests++;
        totalLinked += result.stats.linkedCount;
        totalContributors += result.stats.totalCount;
      }
      totalTests++;
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`Successful: ${successfulTests}/${totalTests}`);
    console.log(`Total Contributors: ${totalContributors}`);
    console.log(`Linked Contributors: ${totalLinked}`);
    console.log(`Overall Link Rate: ${((totalLinked/totalContributors)*100).toFixed(1)}%`);
    
    const avgProcessingTime = results.reduce((sum, r) => sum + r.stats.processingTime, 0) / results.length;
    console.log(`Average Processing Time: ${avgProcessingTime.toFixed(1)}ms`);
    
    if (successfulTests === totalTests && totalLinked > 0) {
      console.log('\n🎉 Contributors system working! Ready for static file integration.');
    } else {
      console.log('\n⚠️  Some issues detected. Review before production use.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testMovieContributors };