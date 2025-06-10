#!/usr/bin/env node

/**
 * Episode Content Pre-Generation Script
 * 
 * This script generates all episode content using Claude AI and saves it as static files
 * for instant loading. MediaCards remain dynamic for real-time streaming info.
 */

const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

// Configuration
const SERIES_CONFIG_PATH = path.join(__dirname, '../data/series-config.json');
const OUTPUT_DIR = path.join(__dirname, '../data/episodes');
const CONCURRENT_LIMIT = 3; // Limit concurrent API calls

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load series configuration
function loadSeriesConfig() {
  try {
    const configContent = fs.readFileSync(SERIES_CONFIG_PATH, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading series config:', error);
    process.exit(1);
  }
}

// Enhanced prompt for episode content generation
function createEpisodePrompt(series, episode) {
  return {
    system: `You are a film expert providing thorough, professional analysis. You have encyclopedic knowledge of films from all eras and countries.

CRITICAL REQUIREMENTS:
- START with OPENER: [one compelling sentence that captures the essence]
- Write EXACTLY 6 PARAGRAPH sections (no more, no less)
- Each PARAGRAPH: should be 3-4 sentences and include specific film titles
- ONLY include MOVIES: for films mentioned by title in that paragraph
- End with extensive MORE_IDEAS: list (8-10 additional films)

STRUCTURE EXAMPLE:
OPENER: [one sentence that captures the essence]
PARAGRAPH: [3-4 sentences with specific film titles mentioned]
MOVIES: The Godfather|1972|Coppola's epic family saga|tt0068646
PARAGRAPH: [3-4 sentences about related films/directors]
MOVIES: Taxi Driver|1976|Scorsese's urban nightmare|tt0075314
PARAGRAPH: [3-4 sentences mentioning more films]
MOVIES: Mean Streets|1973|Early Scorsese masterpiece|tt0070379
PARAGRAPH: [3-4 sentences about techniques/innovations]
MOVIES: [relevant films for this paragraph]
PARAGRAPH: [3-4 sentences about cultural impact]
MOVIES: [relevant films for this paragraph]
PARAGRAPH: [3-4 sentences about legacy/influence]
MOVIES: [relevant films for this paragraph]
MORE_IDEAS: [8-10 additional films with format: Title|Year|Description|TMDB_ID]

IMPORTANT: Include TMDB IDs in format ttXXXXXXX for all movies.`,

    user: `Create comprehensive educational content for "${series.title}" - Episode: "${episode.title}: ${episode.subtitle}".

CRITICAL FORMATTING REQUIREMENTS:
- Write EXACTLY 6 paragraphs (no more, no less)
- Each paragraph should be 3-4 sentences
- Each paragraph MUST mention specific film titles
- Include TMDB IDs for all films mentioned
- Follow the exact format specified in system prompt

Structure your 6 paragraphs to cover:
1. Historical context and key breakthrough films
2. Major directors and their signature works
3. Technical and artistic innovations with examples
4. Genre-defining films and their impact
5. Cultural influence and box office success
6. Legacy and influence on modern cinema

Write exactly 6 substantial paragraphs with specific film titles and director names throughout. Focus on film school level depth but keep structure clear and organized.`
  };
}

// Generate content for a single episode
async function generateEpisodeContent(series, episode) {
  const seriesId = series.id;
  const episodeId = episode.id;
  
  console.log(`Generating content for Series ${seriesId}, Episode ${episodeId}: ${episode.title}`);
  
  try {
    const prompt = createEpisodePrompt(series, episode);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
      system: prompt.system,
      messages: [{
        role: 'user',
        content: prompt.user
      }]
    });

    const responseText = message.content[0].text.trim();
    const parsedContent = parseClaudeResponse(responseText);
    
    // Add metadata
    const episodeData = {
      seriesId,
      episodeId,
      series: {
        id: series.id,
        title: series.title,
        description: series.description
      },
      episode: {
        id: episode.id,
        title: episode.title,
        subtitle: episode.subtitle,
        posters: episode.posters || []
      },
      content: parsedContent,
      generatedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    // Save to file
    const fileName = `series-${seriesId}-episode-${episodeId}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(episodeData, null, 2));
    console.log(`✅ Saved: ${fileName}`);
    
    return episodeData;
    
  } catch (error) {
    console.error(`❌ Error generating Series ${seriesId}, Episode ${episodeId}:`, error.message);
    return null;
  }
}

// Parse Claude response (reusing existing logic)
function parseClaudeResponse(responseText) {
  const sections = [];
  const moreIdeasMovies = [];
  let opener = null;
  
  const lines = responseText.split('\n');
  let currentSection = null;
  let currentMovies = [];
  let inMoreIdeas = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    if (trimmedLine.startsWith('OPENER:')) {
      opener = trimmedLine.substring('OPENER:'.length).trim();
      
    } else if (trimmedLine.startsWith('SUBHEAD:')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection
        });
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      // Add subhead
      sections.push({
        type: 'subhead',
        content: trimmedLine.substring('SUBHEAD:'.length).trim()
      });
      currentSection = null;
      
    } else if (trimmedLine.startsWith('PARAGRAPH:')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection
        });
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      // Start new section
      currentSection = trimmedLine.substring('PARAGRAPH:'.length).trim();
      
    } else if (trimmedLine.startsWith('MOVIES:') && !inMoreIdeas) {
      const movieData = trimmedLine.substring('MOVIES:'.length).trim();
      const [title, year, description, tmdbId] = movieData.split('|').map(s => s?.trim());
      
      if (title && year) {
        currentMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          tmdb_id: tmdbId || null,
          poster_url: null, // Will be populated by MediaCard dynamically
          streaming: null   // Will be populated by MediaCard dynamically
        });
      }
      
    } else if (trimmedLine.startsWith('MORE_IDEAS:')) {
      inMoreIdeas = true;
      
      // Save any pending section
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection
        });
        currentSection = null;
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      const movieData = trimmedLine.substring('MORE_IDEAS:'.length).trim();
      const [title, year, description, tmdbId] = movieData.split('|').map(s => s?.trim());
      
      if (title && year) {
        moreIdeasMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          tmdb_id: tmdbId || null,
          poster_url: null,
          streaming: null
        });
      }
    }
  }
  
  // Save final section
  if (currentSection) {
    sections.push({
      type: 'text',
      content: currentSection
    });
    
    if (currentMovies.length > 0) {
      sections.push({
        type: 'movies',
        movies: currentMovies
      });
    }
  }
  
  return {
    opener,
    sections,
    moreIdeas: {
      title: 'More Ideas',
      movies: moreIdeasMovies
    }
  };
}

// Process episodes with concurrency control
async function processEpisodesWithLimit(episodes, limit) {
  const results = [];
  
  for (let i = 0; i < episodes.length; i += limit) {
    const batch = episodes.slice(i, i + limit);
    const batchPromises = batch.map(({ series, episode }) => 
      generateEpisodeContent(series, episode)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add small delay between batches to be respectful to API
    if (i + limit < episodes.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Main execution
async function main() {
  console.log('🚀 Starting episode content pre-generation...');
  
  const seriesConfig = loadSeriesConfig();
  const episodes = [];
  
  // Build list of all episodes to generate
  for (const [seriesId, series] of Object.entries(seriesConfig)) {
    for (const episode of series.episodes) {
      episodes.push({ series, episode });
    }
  }
  
  console.log(`📚 Found ${episodes.length} episodes across ${Object.keys(seriesConfig).length} series`);
  console.log(`⚡ Processing with concurrency limit: ${CONCURRENT_LIMIT}`);
  
  const startTime = Date.now();
  const results = await processEpisodesWithLimit(episodes, CONCURRENT_LIMIT);
  const endTime = Date.now();
  
  const successful = results.filter(r => r !== null).length;
  const failed = results.length - successful;
  
  console.log('\n🎬 Generation Complete!');
  console.log(`✅ Successfully generated: ${successful} episodes`);
  console.log(`❌ Failed: ${failed} episodes`);
  console.log(`⏱️  Total time: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`📁 Files saved to: ${OUTPUT_DIR}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some episodes failed to generate. Check the error messages above.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateEpisodeContent,
  loadSeriesConfig,
  parseClaudeResponse
};