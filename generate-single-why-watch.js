#!/usr/bin/env node

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const tmdbId = process.argv[2] || '603';

async function generateWhyWatchForMovie(tmdbId) {
  console.log(`🎬 Generating Why Watch for movie ${tmdbId}`);
  
  const client = await pool.connect();
  
  try {
    // Get movie info
    const movieResult = await client.query(`
      SELECT m.id, m.title, m.year, m.tmdb_id
      FROM movies m
      WHERE m.tmdb_id = $1
    `, [parseInt(tmdbId)]);
    
    if (movieResult.rows.length === 0) {
      console.log(`❌ No movie found with TMDB ID ${tmdbId}`);
      return;
    }
    
    const movie = movieResult.rows[0];
    console.log(`📊 Found: ${movie.title} (${movie.year})`);
    
    // Create enhanced_why_watch table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS enhanced_why_watch (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
        tmdb_id INTEGER,
        recommendation VARCHAR(10),
        reasons JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(movie_id)
      )
    `);
    
    // Build Why Watch prompt
    const prompt = `You are a film expert providing viewing recommendations. For the movie "${movie.title}" (${movie.year}), provide a recommendation in this exact JSON format:

{
  "recommendation": "YES" or "NO",
  "reasons": [
    "Reason 1 (3-6 words)",
    "Reason 2 (3-6 words)", 
    "Reason 3 (3-6 words)"
  ]
}

Guidelines:
- recommendation: "YES" if worth watching, "NO" if not recommended
- reasons: exactly 3 concise reasons (3-6 words each)
- Focus on what makes this movie special or problematic
- Be honest about quality and appeal`;

    console.log('🤖 Calling Claude API...');
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const response = JSON.parse(message.content[0].text);
    console.log(`📋 Recommendation: ${response.recommendation}`);
    console.log(`📋 Reasons: ${response.reasons.join(' | ')}`);
    
    // Save to database
    await client.query(`
      INSERT INTO enhanced_why_watch (movie_id, tmdb_id, recommendation, reasons)
      VALUES ($1, $2, $3, $4)
    `, [movie.id, movie.tmdb_id, response.recommendation, JSON.stringify(response.reasons)]);
    
    console.log('✅ Saved to enhanced_why_watch table');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

generateWhyWatchForMovie(tmdbId).catch(console.error);