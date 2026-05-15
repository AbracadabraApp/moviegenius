#!/usr/bin/env node

/**
 * Extract Contributors - Batch Version
 * 
 * More efficient batched extraction of contributors from movie analyses
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

function extractKeyElementsContributors(keyElements) {
  const contributors = [];
  
  if (!keyElements) return contributors;
  
  // Director (string or array)
  if (keyElements.director) {
    const directors = Array.isArray(keyElements.director) 
      ? keyElements.director 
      : [keyElements.director];
    directors.forEach(name => {
      if (name && name.trim()) {
        contributors.push({ name: name.trim(), role: 'director' });
      }
    });
  }
  
  // Writers (array)
  if (keyElements.writers && Array.isArray(keyElements.writers)) {
    keyElements.writers.forEach(name => {
      if (name && name.trim()) {
        contributors.push({ name: name.trim(), role: 'writer' });
      }
    });
  }
  
  // Stars (array)
  if (keyElements.stars && Array.isArray(keyElements.stars)) {
    keyElements.stars.forEach(name => {
      if (name && name.trim()) {
        contributors.push({ name: name.trim(), role: 'star' });
      }
    });
  }
  
  // Cinematographer (string or array)
  if (keyElements.cinematographer) {
    const cinematographers = Array.isArray(keyElements.cinematographer)
      ? keyElements.cinematographer
      : [keyElements.cinematographer];
    cinematographers.forEach(name => {
      if (name && name.trim()) {
        contributors.push({ name: name.trim(), role: 'cinematographer' });
      }
    });
  }
  
  // Composer (string or array)
  if (keyElements.composer) {
    const composers = Array.isArray(keyElements.composer)
      ? keyElements.composer
      : [keyElements.composer];
    composers.forEach(name => {
      if (name && name.trim()) {
        contributors.push({ name: name.trim(), role: 'composer' });
      }
    });
  }
  
  return contributors;
}

async function extractContributorsBatch(limit = null, offset = 0) {
  const client = getRailwayClient();
  
  try {
    console.log('🔄 Connecting to Railway database...');
    await client.connect();
    
    // Get total count
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM movie_analyses ma
      JOIN movies m ON m.id = ma.movie_id
      WHERE ma.claude_response::text ILIKE '%keyElements%'
    `);
    
    const totalMovies = parseInt(countResult.rows[0].total);
    console.log(`📊 Total movies with keyElements: ${totalMovies}`);
    
    // Build query with optional limit
    let query = `
      SELECT 
        m.tmdb_id,
        m.title,
        m.year,
        ma.claude_response::text as analysis_data
      FROM movie_analyses ma
      JOIN movies m ON m.id = ma.movie_id
      WHERE ma.claude_response::text ILIKE '%keyElements%'
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
    const analysesResult = await client.query(query, params);
    
    console.log(`🎬 Processing ${analysesResult.rows.length} movies`);
    
    let totalContributors = 0;
    let processedMovies = 0;
    let errorCount = 0;
    
    // Prepare batch insert
    const batchSize = 100;
    let contributorsToInsert = [];
    
    for (const row of analysesResult.rows) {
      try {
        const analysis = JSON.parse(row.analysis_data);
        
        // Extract keyElements from raw_content
        let keyElements = null;
        if (analysis.raw_content) {
          const rawContent = typeof analysis.raw_content === 'string' 
            ? JSON.parse(analysis.raw_content)
            : analysis.raw_content;
          keyElements = rawContent.keyElements;
        }
        
        if (!keyElements) {
          continue;
        }
        
        const contributors = extractKeyElementsContributors(keyElements);
        
        // Add to batch with movie_tmdb_id
        contributors.forEach(contributor => {
          contributorsToInsert.push([
            row.tmdb_id,
            contributor.name,
            contributor.role
          ]);
        });
        
        totalContributors += contributors.length;
        processedMovies++;
        
        // Batch insert when we reach batch size
        if (contributorsToInsert.length >= batchSize) {
          await insertContributorsBatch(client, contributorsToInsert);
          contributorsToInsert = [];
        }
        
        // Progress update
        if (processedMovies % 1000 === 0) {
          console.log(`📊 Progress: ${processedMovies}/${analysesResult.rows.length} movies, ${totalContributors} contributors`);
        }
        
      } catch (parseError) {
        console.error(`❌ Failed to parse ${row.title}:`, parseError.message);
        errorCount++;
      }
    }
    
    // Insert remaining contributors
    if (contributorsToInsert.length > 0) {
      await insertContributorsBatch(client, contributorsToInsert);
    }
    
    // Summary
    console.log('\n🎉 Batch extraction completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Movies processed: ${processedMovies}`);
    console.log(`   - Contributors extracted: ${totalContributors}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // Database stats
    await printDatabaseStats(client);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function insertContributorsBatch(client, contributors) {
  if (contributors.length === 0) return;
  
  try {
    // Build bulk insert query
    const placeholders = contributors.map((_, i) => {
      const base = i * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    }).join(', ');
    
    const values = contributors.flat();
    
    await client.query(`
      INSERT INTO movie_contributors (movie_tmdb_id, person_name, role)
      VALUES ${placeholders}
      ON CONFLICT (movie_tmdb_id, person_name, role) DO NOTHING
    `, values);
    
    console.log(`   ✅ Inserted batch of ${contributors.length} contributors`);
    
  } catch (error) {
    console.error(`❌ Batch insert failed:`, error.message);
  }
}

async function printDatabaseStats(client) {
  // Role statistics
  const statsResult = await client.query(`
    SELECT 
      role,
      COUNT(*) as count,
      COUNT(DISTINCT person_name) as unique_people
    FROM movie_contributors
    GROUP BY role
    ORDER BY count DESC
  `);
  
  console.log('\n📈 Database Statistics by Role:');
  statsResult.rows.forEach(stat => {
    console.log(`   ${stat.role}: ${stat.count} entries, ${stat.unique_people} unique people`);
  });
  
  // Top contributors  
  const topContributors = await client.query(`
    SELECT 
      person_name,
      COUNT(DISTINCT movie_tmdb_id) as movie_count,
      ARRAY_AGG(DISTINCT role) as roles
    FROM movie_contributors
    GROUP BY person_name
    HAVING COUNT(DISTINCT movie_tmdb_id) > 1
    ORDER BY movie_count DESC
    LIMIT 10
  `);
  
  console.log('\n🌟 Top Multi-Movie Contributors:');
  topContributors.rows.forEach((person, index) => {
    console.log(`   ${index + 1}. ${person.person_name}: ${person.movie_count} movies (${person.roles.join(', ')})`);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const offsetArg = args.find(arg => arg.startsWith('--offset='));

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const offset = offsetArg ? parseInt(offsetArg.split('=')[1]) : 0;

// Execute extraction if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractContributorsBatch(limit, offset).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { extractContributorsBatch };