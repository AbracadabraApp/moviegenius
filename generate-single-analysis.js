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

async function generateAnalysisForMovie(tmdbId) {
  console.log(`🎬 Generating analysis for movie ${tmdbId}`);
  
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
    
    // Build contextual analysis prompt (using the new format)
    const prompt = `Create a contextual analysis for "${movie.title}" (${movie.year}) in this exact JSON format:

{
  "metadata": {
    "title": "${movie.title}",
    "year": ${movie.year},
    "analysisType": "contextual",
    "wordCount": 400,
    "targetRange": "375-425",
    "confidenceScore": 9.0
  },
  "keyElements": {
    "director": "Director Name",
    "writers": ["Writer 1", "Writer 2"],
    "stars": ["Actor 1", "Actor 2", "Actor 3"],
    "genre": "Primary Genre",
    "releaseYear": ${movie.year},
    "cinematographer": "Cinematographer Name",
    "composer": "Composer Name",
    "studio": "Studio Name"
  },
  "content": [
    {
      "type": "Dynamic Section Name 1",
      "text": "Analysis paragraph 1 (75-85 words)"
    },
    {
      "type": "Dynamic Section Name 2", 
      "text": "Analysis paragraph 2 (75-85 words)"
    },
    {
      "type": "Dynamic Section Name 3",
      "text": "Analysis paragraph 3 (75-85 words)"
    },
    {
      "type": "Dynamic Section Name 4",
      "text": "Analysis paragraph 4 (75-85 words)"
    }
  ],
  "featuredMovies": [
    {
      "title": "Related Movie 1",
      "year": 2000,
      "description": "Brief connection description"
    },
    {
      "title": "Related Movie 2", 
      "year": 2001,
      "description": "Brief connection description"
    },
    {
      "title": "Related Movie 3",
      "year": 2002,
      "description": "Brief connection description"
    }
  ],
  "exploreTopics": [
    {
      "topic": "Topic Name 1",
      "category": "Category",
      "difficulty": "intermediate"
    },
    {
      "topic": "Topic Name 2",
      "category": "Category", 
      "difficulty": "advanced"
    }
  ]
}

Guidelines:
- Use exactly 4 content sections with dynamic, contextual section names
- Each paragraph should be 75-85 words
- Reference related movies in **Bold Title** (Year) format
- Make section names specific to this movie's themes
- Total word count should be 375-425 words`;

    console.log('🤖 Calling Claude API...');
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const analysis = JSON.parse(message.content[0].text);
    console.log(`📋 Generated analysis with ${analysis.content.length} sections`);
    console.log(`📋 Sections: ${analysis.content.map(s => s.type).join(', ')}`);
    
    // Save to database
    await client.query(`
      INSERT INTO movie_analyses (movie_id, query_text, claude_response)
      VALUES ($1, $2, $3)
    `, [movie.id, `Contextual analysis for ${movie.title} (${movie.year})`, { raw_content: JSON.stringify(analysis) }]);
    
    console.log('✅ Saved to movie_analyses table');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

generateAnalysisForMovie(tmdbId).catch(console.error);