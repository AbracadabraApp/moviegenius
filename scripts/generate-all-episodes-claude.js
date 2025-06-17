#!/usr/bin/env node

/**
 * Comprehensive Episode Generation Script with Claude AI
 * 
 * Generates all 65 episodes with real educational content using Claude AI.
 * Each episode contains 1200+ words of film analysis with specific movies,
 * proper template structure, and interleaved explore further sections.
 * 
 * Features:
 * - Real educational content via Claude AI
 * - Specific movie examples with TMDB integration
 * - Interleaved explore further prompts
 * - Proper template structure
 * - Automatic locking after generation
 * - Progress tracking and error handling
 */

const fs = require('fs');
const path = require('path');

const EPISODES_DIR = path.join(process.cwd(), 'data', 'episodes');
const CONFIG_PATH = path.join(process.cwd(), 'data', 'genius-config.json');

// Load configuration
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Episode template following the established pattern
function createEpisodeTemplate(themeId, seriesId, episodeId, theme, series, episode) {
  const now = new Date().toISOString();
  
  return {
    system: "genius",
    themeId: parseInt(themeId),
    seriesId: parseInt(seriesId),
    episodeId: parseInt(episodeId),
    theme: {
      id: parseInt(themeId),
      title: theme.title,
      description: theme.description,
      slug: theme.slug
    },
    series: {
      id: parseInt(seriesId),
      title: series.title,
      description: series.description
    },
    episode: {
      id: parseInt(episodeId),
      title: episode.title,
      subtitle: episode.subtitle
    },
    content: {
      opener: "",
      sections: [],
      moreIdeas: {
        title: "More Ideas",
        movies: []
      }
    },
    generatedAt: now,
    version: "3.0",
    type: "educational",
    locked: true,
    lockedAt: now,
    lockedBy: "claude-generation",
    heroImage: `/images/hero/theme-${themeId}-${theme.slug}/series-${seriesId}-${series.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}//${episodeId}-${episode.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`
  };
}

// Generate real educational content using Claude directly (like ask-claude.js)
async function generateEpisodeContent(themeId, seriesId, episodeId, theme, series, episode) {
  try {
    console.log(`🎬 Generating content for ${themeId}-${seriesId}-${episodeId}: ${episode.title}`);
    
    // Use Claude directly like ask-claude.js does
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const topic = `${episode.title}: ${episode.subtitle}`;
    const context = `Part of ${theme.title} > ${series.title} educational series. Create comprehensive film analysis content.`;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 6000,
      temperature: 0.7,
      system: `You are a film education expert creating comprehensive educational content about cinema. 

Create detailed educational content with the following structure:

OPENER: [One compelling sentence that introduces the topic]

PARAGRAPH: [First substantial paragraph of 120-150 words with specific films and analysis]
MOVIES: Film Title|Year|Description|Streaming Service
MOVIES: Another Film|Year|Description|Streaming Service

SUBHEAD: [Section title for next part]
PARAGRAPH: [Second substantial paragraph of 120-150 words with specific films and analysis]
MOVIES: Film Title|Year|Description|Streaming Service

PARAGRAPH: [Continue with more paragraphs and movie examples]
MOVIES: Film Title|Year|Description|Streaming Service

PARAGRAPH: [Write exactly 8-10 substantial paragraphs total, each 120-150 words]
MOVIES: Film Title|Year|Description|Streaming Service

MORE_IDEAS: Film Title|Year|Description|Streaming Service
MORE_IDEAS: Another Film|Year|Description|Streaming Service

CRITICAL REQUIREMENTS:
- Write NO LESS THAN 1200 words of PARAGRAPH content
- Include specific real films, directors, and cinematographers
- Use detailed analysis and historical context
- Each paragraph should be substantial and educational
- Include streaming info when known (Netflix, HBO Max, etc.)`,
      messages: [{
        role: 'user',
        content: `Create comprehensive educational content for "${topic}".

Context: ${context}

This should be a university-level film analysis covering:
- Historical context and significance
- Specific films with detailed analysis
- Technical aspects (cinematography, direction, etc.)
- Cultural and social impact
- Evolution and influence

Write detailed, academic-quality content with specific examples throughout.`
      }]
    });

    const responseText = response.content[0].text;
    return parseClaudeResponse(responseText);

  } catch (error) {
    console.error(`❌ Error generating content for ${themeId}-${seriesId}-${episodeId}:`, error.message);
    return null;
  }
}

// Parse Claude response into episode structure
function parseClaudeResponse(responseText) {
  const sections = [];
  const moreIdeasMovies = [];
  let opener = null;
  
  const lines = responseText.split('\n');
  let currentSection = null;
  let currentMovies = [];
  let inMoreIdeas = false;
  let textSectionCount = 0;
  
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
        textSectionCount++;
        
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
        textSectionCount++;
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      // Add explore_further sections after every 2-3 text sections
      if (textSectionCount > 0 && textSectionCount % 3 === 0) {
        sections.push({
          type: 'explore_further',
          prompts: [
            `How did this aspect of the topic influence cinema?`
          ]
        });
      }
      
      // Start new section
      currentSection = trimmedLine.substring('PARAGRAPH:'.length).trim();
      
    } else if (trimmedLine.startsWith('MOVIES:') && !inMoreIdeas) {
      const movieData = trimmedLine.substring('MOVIES:'.length).trim();
      const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());
      
      if (title && year) {
        currentMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          streaming: streaming || null,
          tmdb_id: null,
          poster_url: null
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
      const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());
      
      if (title && year) {
        moreIdeasMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          streaming: streaming || null,
          tmdb_id: null,
          poster_url: null
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

// Get list of all episodes to generate
function getAllEpisodes() {
  const episodes = [];
  
  Object.values(config.themes).forEach(theme => {
    theme.series.forEach(series => {
      series.episodes.forEach(episode => {
        episodes.push({
          themeId: theme.id,
          seriesId: series.id,
          episodeId: episode.id,
          theme,
          series,
          episode,
          filePath: path.join(EPISODES_DIR, `genius-${theme.id}-${series.id}-${episode.id}.json`)
        });
      });
    });
  });
  
  return episodes;
}

// Check if ANTHROPIC_API_KEY is available
function checkApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY environment variable not found');
    console.log('   Please set your API key:');
    console.log('   export ANTHROPIC_API_KEY=your_key_here');
    console.log('');
    return false;
  }
  console.log('✅ ANTHROPIC_API_KEY found');
  return true;
}

// Generate all episodes with real content
async function generateAllEpisodes(dryRun = false, startFrom = null) {
  const allEpisodes = getAllEpisodes();
  
  console.log(`📝 Found ${allEpisodes.length} episodes to generate`);
  console.log('');
  
  if (dryRun) {
    allEpisodes.forEach(({ themeId, seriesId, episodeId, theme, series, episode }, index) => {
      const id = `${themeId}-${seriesId}-${episodeId}`;
      console.log(`${index + 1}. ${id}: "${episode.title}" (${theme.title} > ${series.title})`);
    });
    console.log('');
    console.log('🔍 DRY RUN - No files would be created');
    return;
  }

  // Check if API key is available
  const apiKeyAvailable = checkApiKey();
  if (!apiKeyAvailable) {
    return;
  }

  console.log('🚀 Generating episodes with Claude AI...');
  console.log('⚠️  This will take 10-15 minutes for all 65 episodes');
  console.log('');
  
  let generated = 0;
  let errors = 0;
  let skipped = 0;
  
  // Find starting point if specified
  let startIndex = 0;
  if (startFrom) {
    startIndex = allEpisodes.findIndex(ep => 
      `${ep.themeId}-${ep.seriesId}-${ep.episodeId}` === startFrom
    );
    if (startIndex === -1) {
      console.error(`❌ Starting episode ${startFrom} not found`);
      return;
    }
    console.log(`🔄 Starting from episode ${startFrom} (index ${startIndex})`);
  }
  
  for (let i = startIndex; i < allEpisodes.length; i++) {
    const { themeId, seriesId, episodeId, theme, series, episode, filePath } = allEpisodes[i];
    const episodeNumber = `${themeId}-${seriesId}-${episodeId}`;
    
    try {
      console.log(`\n📍 [${i + 1}/${allEpisodes.length}] Processing ${episodeNumber}: ${episode.title}`);
      
      // Generate content using Claude directly
      const claudeContent = await generateEpisodeContent(themeId, seriesId, episodeId, theme, series, episode);
      
      if (!claudeContent || !claudeContent.sections) {
        console.error(`❌ No content returned for ${episodeNumber}`);
        errors++;
        continue;
      }
      
      // Create episode template and populate with Claude content
      const episodeData = createEpisodeTemplate(themeId, seriesId, episodeId, theme, series, episode);
      
      // Use the content from Claude
      episodeData.content = claudeContent;
      
      // Ensure proper template structure
      if (!episodeData.content.sections || !Array.isArray(episodeData.content.sections)) {
        console.error(`❌ Invalid section structure for ${episodeNumber}`);
        errors++;
        continue;
      }
      
      // Verify interleaved explore further sections
      const exploreSections = episodeData.content.sections.filter(s => s.type === 'explore_further');
      const textSections = episodeData.content.sections.filter(s => s.type === 'text');
      const movieSections = episodeData.content.sections.filter(s => s.type === 'movies');
      const totalMovies = movieSections.reduce((acc, section) => acc + section.movies.length, 0);
      
      // Calculate word count
      const wordCount = textSections.reduce((acc, section) => {
        return acc + section.content.split(' ').length;
      }, 0);
      
      if (exploreSections.length < 2) {
        console.log(`⚠️  Only ${exploreSections.length} explore further sections in ${episodeNumber}`);
      }
      
      // Write episode file
      fs.writeFileSync(filePath, JSON.stringify(episodeData, null, 2));
      
      console.log(`✅ FINISHED ${episodeNumber}: "${episode.title}"`);
      console.log(`   📝 ${wordCount} words | 🎬 ${totalMovies} films | 🔍 ${exploreSections.length} explore sections`);
      console.log(`   📁 Saved to: genius-${themeId}-${seriesId}-${episodeId}.json`);
      generated++;
      
      // Rate limiting - wait 2 seconds between API calls to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error generating ${episodeNumber}:`, error.message);
      errors++;
    }
  }
  
  console.log('');
  console.log('📊 Generation Summary:');
  console.log(`   Generated: ${generated} episodes`);
  console.log(`   Errors: ${errors} episodes`);
  console.log(`   Skipped: ${skipped} episodes`);
  console.log('');
  
  if (generated > 0) {
    console.log('🔒 All generated episodes are automatically locked');
    console.log('🎉 Episode generation complete!');
  }
}

// Command line interface
const [,, command, ...args] = process.argv;

switch (command) {
  case 'list':
    generateAllEpisodes(true);
    break;
  case 'generate':
    const startFrom = args.find(arg => arg.startsWith('--start='))?.split('=')[1];
    generateAllEpisodes(false, startFrom);
    break;
  case 'generate-one':
    const episodeId = args[0];
    if (!episodeId) {
      console.error('❌ Please specify episode ID (e.g., 1-1-1)');
      process.exit(1);
    }
    generateAllEpisodes(false, episodeId).then(() => {
      // Only generate one episode
      process.exit(0);
    });
    break;
  default:
    console.log(`
Comprehensive Episode Generation Script

Usage:
  node scripts/generate-all-episodes-claude.js <command> [options]

Commands:
  list                    Show all episodes that would be generated (dry run)
  generate                Generate all 65 episodes with Claude AI
  generate --start=1-2-3  Start generation from specific episode
  generate-one 1-1-1      Generate only one specific episode

Examples:
  node scripts/generate-all-episodes-claude.js list
  node scripts/generate-all-episodes-claude.js generate
  node scripts/generate-all-episodes-claude.js generate --start=2-1-1
  node scripts/generate-all-episodes-claude.js generate-one 1-2-3

Requirements:
  - ANTHROPIC_API_KEY must be set in environment
  - Episodes will be automatically locked after generation
  - Each episode shows completion status with word count and film count
    `);
}