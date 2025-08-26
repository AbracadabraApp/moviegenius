#!/usr/bin/env node

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { getMovieContributors } from './lib/services/contributors-service.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const tmdbId = process.argv[2] || '603';
const outputDir = './public/data/enhanced-movies';

async function generateSingleMovie(tmdbId) {
  console.log(`🎬 Generating enhanced static file for movie ${tmdbId}`);
  
  const client = await pool.connect();
  
  try {
    // Get movie and analysis from database
    const result = await client.query(`
      SELECT 
        m.id,
        m.tmdb_id,
        m.title,
        m.year,
        ma.id as analysis_id,
        ma.claude_response
      FROM movies m
      JOIN movie_analyses ma ON m.id = ma.movie_id
      WHERE m.tmdb_id = $1
        AND ma.claude_response IS NOT NULL
    `, [parseInt(tmdbId)]);
    
    if (result.rows.length === 0) {
      console.log(`❌ No movie found with TMDB ID ${tmdbId}`);
      return;
    }
    
    const movie = result.rows[0];
    console.log(`📊 Found: ${movie.title} (${movie.year})`);
    
    // Parse analysis
    const analysis = JSON.parse(movie.claude_response.raw_content);
    
    // Get contributors
    let contributors = null;
    try {
      contributors = await getMovieContributors(movie.id, movie.tmdb_id);
      console.log(`✅ Found contributors data`);
    } catch (error) {
      console.log(`⚠️  No contributors: ${error.message}`);
    }
    
    // Create enhanced data structure
    const enhancedData = {
      enhancedFormat: true,
      movieId: movie.id,
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      
      analysis: {
        keyElements: analysis.keyElements || {},
        sections: (analysis.sections || analysis.content || []).map(section => ({
          type: section.subhead || section.type || 'Analysis',
          content: section.text || section.content || '',
          text: section.text || section.content || ''
        })),
        whyWatch: analysis.whyWatch || { recommendation: 'NO', reasons: [] },
        featuredMovies: analysis.featuredMovies || [],
        exploreTopics: analysis.exploreTopics || []
      },
      
      browseCollections: { lists: [], totalLists: 0 },
      
      contributors: contributors || {
        director: null,
        writers: [],
        stars: [],
        cinematographer: null,
        composer: null
      },
      
      moreIdeas: null,
      
      generatedAt: new Date().toISOString(),
      sources: {
        analysis: 'railway_database',
        contributors: contributors ? 'movie_contributors_table' : 'analysis_fallback'
      }
    };
    
    // Write file
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `movie-${tmdbId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(enhancedData, null, 2));
    
    console.log(`✅ Generated: ${outputFile}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

generateSingleMovie(tmdbId).catch(console.error);