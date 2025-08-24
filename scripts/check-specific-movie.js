#!/usr/bin/env node

/**
 * Check Specific Movie Storage
 * 
 * Check what's stored for a movie we know was processed with links
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

async function checkSpecificMovie() {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('🔍 Checking specific movies for link storage...\n');
    
    // Check some movies we know should have had recent processing
    const testMovies = [550, 680, 11, 13]; // Fight Club, Pulp Fiction, Star Wars, etc.
    
    for (const tmdbId of testMovies) {
      console.log(`\n=== TMDB ID: ${tmdbId} ===`);
      
      // Get movie info
      const movieResult = await client.query(`
        SELECT title, year FROM movies WHERE tmdb_id = $1
      `, [tmdbId]);
      
      if (movieResult.rows.length === 0) {
        console.log('❌ Movie not found');
        continue;
      }
      
      const movie = movieResult.rows[0];
      console.log(`🎬 ${movie.title} (${movie.year})`);
      
      // Get analysis
      const analysisResult = await client.query(`
        SELECT ma.claude_response, ma.updated_at
        FROM movie_analyses ma
        JOIN movies m ON m.id = ma.movie_id
        WHERE m.tmdb_id = $1
      `, [tmdbId]);
      
      if (analysisResult.rows.length === 0) {
        console.log('❌ No analysis found');
        continue;
      }
      
      const analysis = analysisResult.rows[0].claude_response;
      console.log(`📅 Last updated: ${analysisResult.rows[0].updated_at}`);
      
      // Check what's stored
      if (typeof analysis === 'object' && analysis.processed_content) {
        console.log('📋 Has processed_content');
        
        let processedContent;
        if (typeof analysis.processed_content === 'string') {
          try {
            processedContent = JSON.parse(analysis.processed_content);
            console.log('✅ Parsed processed_content JSON');
          } catch (e) {
            console.log('❌ processed_content is not valid JSON, checking raw...');
            // Check for links in the raw string
            const rawContent = analysis.processed_content;
            const movieLinks = (rawContent.match(/<a href="\/movie\/\d+"/g) || []).length;
            const personLinks = (rawContent.match(/<a href="\/person\/\d+"/g) || []).length;
            console.log(`🔗 Found in raw text: ${movieLinks} movie links, ${personLinks} person links`);
            continue;
          }
        } else {
          processedContent = analysis.processed_content;
        }
        
        // Count all links
        let totalMovieLinks = 0;
        let totalPersonLinks = 0;
        
        // Check content sections
        if (processedContent.content && Array.isArray(processedContent.content)) {
          processedContent.content.forEach(section => {
            if (section.text) {
              totalMovieLinks += (section.text.match(/<a href="\/movie\/\d+"/g) || []).length;
              totalPersonLinks += (section.text.match(/<a href="\/person\/\d+"/g) || []).length;
            }
          });
        }
        
        // Check whyWatch
        if (processedContent.whyWatch && processedContent.whyWatch.text) {
          totalMovieLinks += (processedContent.whyWatch.text.match(/<a href="\/movie\/\d+"/g) || []).length;
          totalPersonLinks += (processedContent.whyWatch.text.match(/<a href="\/person\/\d+"/g) || []).length;
        }
        
        // Check moreIdeas
        if (processedContent.moreIdeas && Array.isArray(processedContent.moreIdeas)) {
          processedContent.moreIdeas.forEach(idea => {
            if (idea.text) {
              totalMovieLinks += (idea.text.match(/<a href="\/movie\/\d+"/g) || []).length;
              totalPersonLinks += (idea.text.match(/<a href="\/person\/\d+"/g) || []).length;
            }
          });
        }
        
        console.log(`🔗 TOTAL LINKS: ${totalMovieLinks} movies, ${totalPersonLinks} people`);
        
        if (totalMovieLinks > 0 || totalPersonLinks > 0) {
          console.log('✅ SUCCESS: Movie has links stored in database!');
        } else {
          console.log('⚠️  No links found in processed content');
        }
        
      } else {
        console.log('❌ No processed_content found');
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await client.end();
  }
}

checkSpecificMovie().catch(console.error);