#!/usr/bin/env node

/**
 * Extract Contributors from Movie Analyses
 * 
 * Extracts all keyElements contributors from movie analyses and populates
 * the movie_contributors table for Phase 1 person discovery system
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

async function extractContributors() {
  const client = getRailwayClient();
  
  try {
    console.log('🔄 Connecting to Railway database...');
    await client.connect();
    
    // Get all movie analyses with keyElements
    console.log('📋 Fetching movie analyses with keyElements...');
    const analysesResult = await client.query(`
      SELECT 
        m.tmdb_id,
        m.title,
        m.year,
        ma.claude_response::text as analysis_data
      FROM movie_analyses ma
      JOIN movies m ON m.id = ma.movie_id
      WHERE ma.claude_response::text ILIKE '%keyElements%'
      ORDER BY m.tmdb_id
    `);
    
    console.log(`🎬 Found ${analysesResult.rows.length} movies with keyElements`);
    
    let totalContributors = 0;
    let processedMovies = 0;
    let errorCount = 0;
    
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
          console.log(`⚠️  No keyElements found in ${row.title} (${row.tmdb_id})`);
          continue;
        }
        
        console.log(`\n🎥 Processing: ${row.title} (${row.year}) - TMDB: ${row.tmdb_id}`);
        
        // Extract contributors by role
        const contributors = [];
        
        // Director (can be string or array)
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
        
        // Cinematographer (can be string or array)
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
        
        // Composer (can be string or array)
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
        
        console.log(`   👥 Found ${contributors.length} contributors`);
        
        // Insert contributors into database
        for (const contributor of contributors) {
          try {
            await client.query(`
              INSERT INTO movie_contributors (movie_tmdb_id, person_name, role)
              VALUES ($1, $2, $3)
              ON CONFLICT (movie_tmdb_id, person_name, role) DO NOTHING
            `, [row.tmdb_id, contributor.name, contributor.role]);
            
          } catch (insertError) {
            console.error(`❌ Failed to insert ${contributor.name} (${contributor.role}):`, insertError.message);
            errorCount++;
          }
        }
        
        totalContributors += contributors.length;
        processedMovies++;
        
        // Progress update every 50 movies
        if (processedMovies % 50 === 0) {
          console.log(`\n📊 Progress: ${processedMovies}/${analysesResult.rows.length} movies processed, ${totalContributors} contributors extracted`);
        }
        
      } catch (parseError) {
        console.error(`❌ Failed to parse analysis for ${row.title}:`, parseError.message);
        errorCount++;
      }
    }
    
    // Summary statistics
    console.log('\n🎉 Extraction completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Movies processed: ${processedMovies}`);
    console.log(`   - Contributors extracted: ${totalContributors}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // Database statistics
    const statsResult = await client.query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(DISTINCT person_name) as unique_people,
        COUNT(DISTINCT movie_tmdb_id) as movies_with_role
      FROM movie_contributors
      GROUP BY role
      ORDER BY count DESC
    `);
    
    console.log('\n📈 Database Statistics:');
    statsResult.rows.forEach(stat => {
      console.log(`   ${stat.role}: ${stat.count} entries, ${stat.unique_people} unique people, ${stat.movies_with_role} movies`);
    });
    
    // Top contributors by movie count
    const topContributors = await client.query(`
      SELECT 
        person_name,
        COUNT(DISTINCT movie_tmdb_id) as movie_count,
        ARRAY_AGG(DISTINCT role) as roles
      FROM movie_contributors
      GROUP BY person_name
      HAVING COUNT(DISTINCT movie_tmdb_id) > 1
      ORDER BY movie_count DESC
      LIMIT 20
    `);
    
    console.log('\n🌟 Top Contributors (multiple movies):');
    topContributors.rows.forEach((person, index) => {
      console.log(`   ${index + 1}. ${person.person_name}: ${person.movie_count} movies (${person.roles.join(', ')})`);
    });
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Execute extraction if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractContributors().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { extractContributors };