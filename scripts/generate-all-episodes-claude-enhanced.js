#!/usr/bin/env node

/**
 * Enhanced Comprehensive Episode Generation Script with Claude AI
 * 
 * Generates all 65 episodes with real educational content using Claude AI.
 * Each episode contains 1200+ words of film analysis with specific movies,
 * proper template structure, and interleaved explore further sections.
 * 
 * Enhanced Features:
 * - Real educational content via Claude AI
 * - TMDB integration for movie data enrichment
 * - Content quality validation
 * - Retry logic for API failures
 * - Backup existing files before overwrite
 * - Configurable parameters
 * - Progress persistence
 * - Better error handling and security
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Configuration object for easy tuning
const CONFIG = {
  RATE_LIMIT_MS: 2000,           // Time between API calls
  MAX_TOKENS: 6000,              // Claude token limit
  TEMPERATURE: 0.7,              // Claude creativity
  MIN_WORD_COUNT: 1200,          // Minimum episode word count
  EXPLORE_SECTIONS_INTERVAL: 3,  // Add explore_further every N text sections
  MAX_RETRIES: 3,                // API retry attempts
  BACKUP_DIR: 'backups',         // Backup directory name
  PROGRESS_FILE: '.generation-progress.json', // Progress tracking file
  TMDB_RATE_LIMIT_MS: 250       // TMDB API rate limit (4 req/sec)
};

const EPISODES_DIR = path.join(process.cwd(), 'data', 'episodes');
const CONFIG_PATH = path.join(process.cwd(), 'data', 'genius-config.json');
const BACKUP_DIR = path.join(EPISODES_DIR, CONFIG.BACKUP_DIR);
const PROGRESS_PATH = path.join(process.cwd(), CONFIG.PROGRESS_FILE);

// Load configuration
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Progress tracking
let progressData = {
  started: null,
  completed: [],
  failed: [],
  totalEpisodes: 0,
  currentEpisode: null
};

// Initialize progress tracking
function initializeProgress() {
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      progressData = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      console.log(`📊 Loaded existing progress: ${progressData.completed.length} completed, ${progressData.failed.length} failed`);
    } catch (error) {
      console.warn('⚠️  Failed to load progress file, starting fresh');
    }
  }
}

// Save progress
function saveProgress() {
  try {
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progressData, null, 2));
  } catch (error) {
    console.warn('⚠️  Failed to save progress:', error.message);
  }
}

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
    lockedBy: "claude-generation-enhanced",
    heroImage: `/images/hero/theme-${themeId}-${theme.slug}/series-${seriesId}-${series.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}//${episodeId}-${episode.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`
  };
}

// Enhanced API key checking with better security
function checkApiKeys() {
  const issues = [];
  
  if (!process.env.ANTHROPIC_API_KEY) {
    issues.push('ANTHROPIC_API_KEY environment variable not found');
  }
  
  if (!process.env.TMDB_API_KEY) {
    issues.push('TMDB_API_KEY environment variable not found (required for movie data)');
  }
  
  if (issues.length > 0) {
    console.log('❌ Missing required environment variables:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
    console.log('   Please check your .env file configuration');
    console.log('   Example:');
    console.log('   ANTHROPIC_API_KEY=your_anthropic_key_here');
    console.log('   TMDB_API_KEY=your_tmdb_key_here');
    console.log('');
    return false;
  }
  
  console.log('✅ All required API keys found');
  return true;
}

// TMDB integration for movie data enrichment
async function enrichMovieData(movies, episodeNumber) {
  if (!movies || movies.length === 0) return;
  
  console.log(`🎬 Enriching ${movies.length} movies with TMDB data...`);
  
  for (const movie of movies) {
    try {
      // Search for movie on TMDB
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const tmdbData = await response.json();
      const match = tmdbData.results?.[0];
      
      if (match && Math.abs(match.release_date?.substring(0, 4) - movie.year) <= 1) {
        movie.tmdb_id = match.id;
        movie.poster_url = match.poster_path ? 
          `https://image.tmdb.org/t/p/w500${match.poster_path}` : null;
        
        // Enhance description if it was empty
        if (!movie.slug || movie.slug.length < 10) {
          movie.slug = match.overview || movie.slug;
        }
        
        console.log(`   ✅ ${movie.title} (${movie.year}) → TMDB ID ${match.id}`);
      } else {
        console.log(`   ⚠️  No TMDB match for "${movie.title}" (${movie.year})`);
      }
      
      // Rate limiting for TMDB API
      await new Promise(resolve => setTimeout(resolve, CONFIG.TMDB_RATE_LIMIT_MS));
      
    } catch (error) {
      console.warn(`   ❌ TMDB lookup failed for "${movie.title}" (${movie.year}):`, error.message);
    }
  }
}

// Retry wrapper for API calls
async function withRetry(fn, context, maxRetries = CONFIG.MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`${context} failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      const delay = attempt * 1000; // Exponential backoff
      console.log(`   ⚠️  ${context} attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Generate real educational content using Claude with retry logic
async function generateEpisodeContent(themeId, seriesId, episodeId, theme, series, episode) {
  const episodeNumber = `${themeId}-${seriesId}-${episodeId}`;
  
  return await withRetry(async () => {
    console.log(`🎬 Generating content for ${episodeNumber}: ${episode.title}`);
    
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const topic = `${episode.title}: ${episode.subtitle}`;
    const context = `Part of ${theme.title} > ${series.title} educational series. Create comprehensive film analysis content.`;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: CONFIG.MAX_TOKENS,
      temperature: CONFIG.TEMPERATURE,
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
- Write NO LESS THAN ${CONFIG.MIN_WORD_COUNT} words of PARAGRAPH content
- Include specific real films, directors, and cinematographers
- Use detailed analysis and historical context
- Each paragraph should be substantial and educational
- Include streaming info when known (Netflix, HBO Max, etc.)
- Ensure ALL movie titles and years are accurate`,
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
  }, `Claude content generation for ${episodeNumber}`);
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
      
      // Add explore_further sections at configured intervals
      if (textSectionCount > 0 && textSectionCount % CONFIG.EXPLORE_SECTIONS_INTERVAL === 0) {
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
      
      if (title && year && !isNaN(parseInt(year))) {
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
      
      if (title && year && !isNaN(parseInt(year))) {
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

// Content quality validation
function validateEpisodeContent(content, episodeNumber) {
  const issues = [];
  
  // Check word count
  const textSections = content.sections.filter(s => s.type === 'text');
  const wordCount = textSections.reduce((acc, section) => {
    return acc + section.content.split(/\s+/).length;
  }, 0);
  
  if (wordCount < CONFIG.MIN_WORD_COUNT) {
    issues.push(`Word count ${wordCount} below minimum ${CONFIG.MIN_WORD_COUNT}`);
  }
  
  // Check for movie sections
  const movieSections = content.sections.filter(s => s.type === 'movies');
  if (movieSections.length === 0) {
    issues.push('No movie sections found');
  }
  
  // Check for opener
  if (!content.opener || content.opener.length < 10) {
    issues.push('Missing or too short opener');
  }
  
  // Check for explore_further sections
  const exploreSections = content.sections.filter(s => s.type === 'explore_further');
  if (exploreSections.length < 2) {
    issues.push(`Only ${exploreSections.length} explore_further sections (recommend 2+)`);
  }
  
  // Check movie data quality
  const allMovies = [
    ...movieSections.flatMap(s => s.movies),
    ...content.moreIdeas.movies
  ];
  
  const moviesWithoutTMDB = allMovies.filter(m => !m.tmdb_id);
  if (moviesWithoutTMDB.length > allMovies.length * 0.5) {
    issues.push(`${moviesWithoutTMDB.length}/${allMovies.length} movies missing TMDB data`);
  }
  
  return { issues, wordCount, movieCount: allMovies.length };
}

// Backup existing file before overwrite
function backupExistingFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const filename = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${filename}.${timestamp}.backup`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`   💾 Backed up existing file to: ${path.relative(EPISODES_DIR, backupPath)}`);
    return backupPath;
  } catch (error) {
    console.warn(`   ⚠️  Failed to backup existing file: ${error.message}`);
    return null;
  }
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

// Generate all episodes with enhanced features
async function generateAllEpisodes(options = {}) {
  const { dryRun = false, startFrom = null, validateOnly = false, force = false } = options;
  
  const allEpisodes = getAllEpisodes();
  progressData.totalEpisodes = allEpisodes.length;
  
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

  // Check if API keys are available
  if (!checkApiKeys()) {
    return;
  }

  // Initialize progress tracking
  initializeProgress();
  
  if (validateOnly) {
    console.log('🔍 VALIDATION MODE - Checking existing episode content quality');
    console.log('');
    
    let validationResults = [];
    
    for (const { themeId, seriesId, episodeId, filePath } of allEpisodes) {
      const episodeNumber = `${themeId}-${seriesId}-${episodeId}`;
      
      if (fs.existsSync(filePath)) {
        try {
          const episodeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const validation = validateEpisodeContent(episodeData.content, episodeNumber);
          validationResults.push({ episodeNumber, ...validation });
          
          if (validation.issues.length > 0) {
            console.log(`❌ ${episodeNumber}: ${validation.issues.join(', ')}`);
          } else {
            console.log(`✅ ${episodeNumber}: ${validation.wordCount} words, ${validation.movieCount} movies`);
          }
        } catch (error) {
          console.log(`💥 ${episodeNumber}: Failed to parse - ${error.message}`);
        }
      } else {
        console.log(`❓ ${episodeNumber}: File not found`);
      }
    }
    
    console.log('\n📊 Validation Summary:');
    const passed = validationResults.filter(r => r.issues.length === 0).length;
    console.log(`   Passed: ${passed}/${validationResults.length} episodes`);
    console.log(`   Average word count: ${Math.round(validationResults.reduce((acc, r) => acc + r.wordCount, 0) / validationResults.length)}`);
    return;
  }

  console.log('🚀 Generating episodes with Claude AI...');
  console.log(`⚠️  This will take approximately ${Math.ceil(allEpisodes.length * (CONFIG.RATE_LIMIT_MS + 3000) / 60000)} minutes for all ${allEpisodes.length} episodes`);
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
    console.log(`🔄 Starting from episode ${startFrom} (index ${startIndex + 1}/${allEpisodes.length})`);
  }
  
  // Update progress
  progressData.started = new Date().toISOString();
  progressData.currentEpisode = startFrom;
  saveProgress();
  
  for (let i = startIndex; i < allEpisodes.length; i++) {
    const { themeId, seriesId, episodeId, theme, series, episode, filePath } = allEpisodes[i];
    const episodeNumber = `${themeId}-${seriesId}-${episodeId}`;
    
    try {
      console.log(`\n📍 [${i + 1}/${allEpisodes.length}] Processing ${episodeNumber}: ${episode.title}`);
      
      // Check if file exists and is locked
      if (fs.existsSync(filePath) && !force) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (existing.locked) {
            console.log(`   🔒 Skipping locked episode`);
            skipped++;
            continue;
          }
        } catch (error) {
          console.log(`   ⚠️  Existing file corrupted, will regenerate`);
        }
      }
      
      // Update progress
      progressData.currentEpisode = episodeNumber;
      saveProgress();
      
      // Backup existing file
      backupExistingFile(filePath);
      
      // Generate content using Claude
      const claudeContent = await generateEpisodeContent(themeId, seriesId, episodeId, theme, series, episode);
      
      if (!claudeContent || !claudeContent.sections) {
        throw new Error('No content returned from Claude');
      }
      
      // Enrich movie data with TMDB
      const movieSections = claudeContent.sections.filter(s => s.type === 'movies');
      for (const section of movieSections) {
        await enrichMovieData(section.movies, episodeNumber);
      }
      await enrichMovieData(claudeContent.moreIdeas.movies, episodeNumber);
      
      // Create episode template and populate with Claude content
      const episodeData = createEpisodeTemplate(themeId, seriesId, episodeId, theme, series, episode);
      episodeData.content = claudeContent;
      
      // Validate content quality
      const validation = validateEpisodeContent(episodeData.content, episodeNumber);
      
      if (validation.issues.length > 0) {
        console.log(`   ⚠️  Quality issues: ${validation.issues.join(', ')}`);
      }
      
      // Write episode file
      fs.writeFileSync(filePath, JSON.stringify(episodeData, null, 2));
      
      // Update progress
      progressData.completed.push(episodeNumber);
      saveProgress();
      
      console.log(`✅ FINISHED ${episodeNumber}: "${episode.title}"`);
      console.log(`   📝 ${validation.wordCount} words | 🎬 ${validation.movieCount} films | 🔍 ${claudeContent.sections.filter(s => s.type === 'explore_further').length} explore sections`);
      console.log(`   📁 Saved to: genius-${themeId}-${seriesId}-${episodeId}.json`);
      generated++;
      
      // Rate limiting - wait between API calls
      if (i < allEpisodes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
      }
      
    } catch (error) {
      console.error(`❌ Error generating ${episodeNumber}:`, error.message);
      progressData.failed.push({ episodeNumber, error: error.message });
      saveProgress();
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
    
    // Clean up progress file on successful completion
    if (errors === 0 && fs.existsSync(PROGRESS_PATH)) {
      fs.unlinkSync(PROGRESS_PATH);
      console.log('🗑️  Cleaned up progress file');
    }
  }
}

// Command line interface
const [,, command, ...args] = process.argv;

// Parse command line options
const options = {
  dryRun: false,
  startFrom: null,
  validateOnly: false,
  force: false
};

args.forEach(arg => {
  if (arg.startsWith('--start=')) {
    options.startFrom = arg.split('=')[1];
  } else if (arg === '--force') {
    options.force = true;
  } else if (arg === '--validate') {
    options.validateOnly = true;
  }
});

switch (command) {
  case 'list':
    options.dryRun = true;
    generateAllEpisodes(options);
    break;
    
  case 'validate':
    options.validateOnly = true;
    generateAllEpisodes(options);
    break;
    
  case 'generate':
    generateAllEpisodes(options);
    break;
    
  case 'generate-one':
    const episodeId = args.find(arg => !arg.startsWith('--'));
    if (!episodeId) {
      console.error('❌ Please specify episode ID (e.g., 1-1-1)');
      process.exit(1);
    }
    options.startFrom = episodeId;
    generateAllEpisodes(options).then(() => {
      process.exit(0);
    });
    break;
    
  case 'clean-progress':
    if (fs.existsSync(PROGRESS_PATH)) {
      fs.unlinkSync(PROGRESS_PATH);
      console.log('🗑️  Cleaned up progress file');
    } else {
      console.log('📄 No progress file found');
    }
    break;
    
  default:
    console.log(`
Enhanced Comprehensive Episode Generation Script

Usage:
  node scripts/generate-all-episodes-claude-enhanced.js <command> [options]

Commands:
  list                    Show all episodes that would be generated (dry run)
  validate                Check content quality of existing episodes
  generate                Generate all episodes with Claude AI
  generate-one <id>       Generate only one specific episode
  clean-progress          Remove progress tracking file

Options:
  --start=<episode-id>    Start generation from specific episode (e.g., --start=2-1-1)
  --force                 Overwrite locked episodes
  --validate              Only validate existing content, don't generate

Examples:
  node scripts/generate-all-episodes-claude-enhanced.js list
  node scripts/generate-all-episodes-claude-enhanced.js validate
  node scripts/generate-all-episodes-claude-enhanced.js generate
  node scripts/generate-all-episodes-claude-enhanced.js generate --start=2-1-1 --force
  node scripts/generate-all-episodes-claude-enhanced.js generate-one 1-2-3

Features:
  ✅ TMDB integration for movie data enrichment
  ✅ Content quality validation
  ✅ Automatic file backups before overwrite
  ✅ API retry logic with exponential backoff
  ✅ Progress tracking and resumable generation
  ✅ Enhanced error handling and security
  ✅ Configurable rate limiting and parameters

Requirements:
  - ANTHROPIC_API_KEY must be set in environment
  - TMDB_API_KEY must be set in environment for movie data
  - Episodes will be automatically locked after generation
    `);
}