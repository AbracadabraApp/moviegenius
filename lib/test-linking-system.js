/**
 * Test Linking System - Production-grade movie and contributor linking
 * 
 * Creates HTML links using real database indexes for accurate ID resolution.
 * Uses pre-built database indexes for fast O(1) lookups.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production indexes loaded from database export
let movieIndexes = null;
let personIndexes = null;
let contributorIndexes = null;
let initialized = false;

const BACKUP_FILE = '/Users/josh.petersen/moviegenius/analyses-test-2025-08-18T23-14-16-947Z.json';
const INDEXES_DIR = path.join(__dirname, '..', 'public', 'data', 'indexes');

/**
 * Load production database indexes
 */
async function initializeIndexes() {
  if (initialized) return;
  
  console.log('🔄 Loading production database indexes...');
  
  try {
    // Load pre-built database indexes
    const moviesPath = path.join(INDEXES_DIR, 'movies.json');
    const personsPath = path.join(INDEXES_DIR, 'persons.json');
    const contributorsPath = path.join(INDEXES_DIR, 'movie-contributors.json');
    
    movieIndexes = JSON.parse(fs.readFileSync(moviesPath, 'utf-8'));
    personIndexes = JSON.parse(fs.readFileSync(personsPath, 'utf-8'));
    contributorIndexes = JSON.parse(fs.readFileSync(contributorsPath, 'utf-8'));
    
    console.log(`✅ Loaded production indexes:`);
    console.log(`   📽️ ${movieIndexes.count} movies`);
    console.log(`   👥 ${personIndexes.count} persons`);
    console.log(`   🎬 ${contributorIndexes.count} contributors`);
    
    initialized = true;
    
  } catch (error) {
    console.error('❌ Failed to load database indexes:', error.message);
    console.error('   Make sure to run: node scripts/generate-build-indexes.js');
    throw error;
  }
}

/**
 * Extract movie mentions from content
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];

  const mentions = [];

  // Pattern 1: **Movie Title** (Year)
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;

  while ((match = boldWithYearPattern.exec(content)) !== null) {
    let title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Remove year from title if already included
    const yearInTitle = `(${year})`;
    if (title.endsWith(yearInTitle)) {
      title = title.slice(0, -yearInTitle.length).trim();
    }

    mentions.push({
      original: match[0],
      title,
      year,
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold_with_year',
    });
  }

  // Pattern 2: **Movie Title**
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
  boldWithoutYearPattern.lastIndex = 0;

  while ((match = boldWithoutYearPattern.exec(content)) !== null) {
    const title = match[1].trim();

    // Check for overlap with year patterns
    const overlaps = mentions.some(
      existing =>
        (match.index >= existing.start && match.index < existing.end) ||
        (existing.start >= match.index && existing.start < match.index + match[0].length)
    );

    if (!overlaps) {
      mentions.push({
        original: match[0],
        title,
        year: null,
        start: match.index,
        end: match.index + match[0].length,
        type: 'bold_without_year',
      });
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Look up movie using production database indexes
 */
function lookupMovie(title, year = null) {
  if (!movieIndexes) return null;
  
  const normalizedTitle = title.toLowerCase().trim();
  
  if (year) {
    // Try exact title + year first
    const exactKey = `${normalizedTitle} ${year}`;
    const exactMatch = movieIndexes.by_title_year[exactKey];
    if (exactMatch) return exactMatch;
  }
  
  // Try title only
  return movieIndexes.by_title[normalizedTitle] || null;
}

/**
 * Look up person using production database indexes
 */
function lookupPerson(name) {
  if (!personIndexes) return null;
  
  const normalizedName = name.toLowerCase().trim();
  return personIndexes.by_name[normalizedName] || null;
}

/**
 * Extract contributors from keyElements
 */
function extractContributors(rawContent) {
  if (!rawContent) return [];
  
  const contributors = [];
  
  try {
    const parsed = JSON.parse(rawContent);
    const keyElements = parsed.keyElements || {};
    
    if (keyElements.director) {
      contributors.push({ name: keyElements.director, role: 'director' });
    }
    
    if (keyElements.stars && Array.isArray(keyElements.stars)) {
      keyElements.stars.forEach(star => {
        contributors.push({ name: star, role: 'star' });
      });
    }
    
    if (keyElements.writers && Array.isArray(keyElements.writers)) {
      keyElements.writers.forEach(writer => {
        contributors.push({ name: writer, role: 'writer' });
      });
    }
    
    if (keyElements.cinematographer) {
      contributors.push({ name: keyElements.cinematographer, role: 'cinematographer' });
    }
    
    if (keyElements.composer) {
      contributors.push({ name: keyElements.composer, role: 'composer' });
    }
    
  } catch (error) {
    console.warn('Failed to extract contributors:', error.message);
  }
  
  return contributors;
}

/**
 * Process content with movie and contributor links (production-grade)
 */
async function processAnalysisContent(content, currentMovieTitle = '', context = '', rawContent = '') {
  await initializeIndexes();
  
  if (!content || typeof content !== 'string') return content;
  
  let processedContent = content;
  let linksCreated = 0;
  let strippedCount = 0;
  
  // Step 1: Process movie links first (to avoid interfering with contributor linking)
  const mentions = extractMovieMentions(processedContent);

  for (const mention of mentions) {
    // Skip self-references
    if (currentMovieTitle && mention.title.toLowerCase().trim() === currentMovieTitle.toLowerCase().trim()) {
      console.log(`🚫 Skipping self-reference: "${mention.title}"`);
      const stripped = mention.year ? `${mention.title} (${mention.year})` : mention.title;
      processedContent = processedContent.replace(mention.original, stripped);
      strippedCount++;
      continue;
    }

    const movieData = lookupMovie(mention.title, mention.year);
    
    if (movieData && movieData.tmdb_id) {
      const link = mention.year
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a>`;

      processedContent = processedContent.replace(mention.original, link);
      linksCreated++;

      console.log(`🔗 Linked "${mention.title}"${mention.year ? ` (${mention.year})` : ''} → /movie/${movieData.tmdb_id}`);
    } else {
      // Strip ** marks as fallback
      const stripped = mention.year ? `${mention.title} (${mention.year})` : mention.title;
      processedContent = processedContent.replace(mention.original, stripped);
      strippedCount++;

      console.log(`⚠️ Stripped marks for "${mention.title}"${mention.year ? ` (${mention.year})` : ''} - not found`);
    }
  }
  
  // Step 2: Process contributor links (avoid double-processing)
  if (rawContent) {
    const contributors = extractContributors(rawContent);
    
    for (const contributor of contributors) {
      const personData = lookupPerson(contributor.name);
      
      if (personData && personData.id) {
        // Only link names that aren't already inside HTML tags
        const namePattern = `\\b${contributor.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`;
        const notInTagPattern = `(?![^<]*>)${namePattern}(?![^<]*</a>)`;
        const nameRegex = new RegExp(notInTagPattern, 'gi');
        
        const link = `<a href="/person/${personData.id}" class="person-name">${contributor.name}</a>`;
        const beforeReplace = processedContent;
        processedContent = processedContent.replace(nameRegex, link);
        
        if (processedContent !== beforeReplace) {
          console.log(`🔗 Linked contributor "${contributor.name}" → /person/${personData.id}`);
        }
      }
    }
  }

  console.log(`✅ ${context}: Created ${linksCreated} total links, ${strippedCount} stripped`);
  
  return processedContent;
}

/**
 * Get analysis data from backup file
 */
async function getAnalysesFromBackup(limit = 5) {
  await initializeIndexes();
  
  const backupContent = fs.readFileSync(BACKUP_FILE, 'utf-8');
  const backupData = JSON.parse(backupContent);
  
  // Filter for analyses that are likely to have good movie references
  const goodAnalyses = backupData.analyses.filter(analysis => {
    try {
      const content = JSON.parse(analysis.claude_response.raw_content);
      const hasContent = content.content && Array.isArray(content.content);
      const hasMovieReferences = JSON.stringify(content).includes('**');
      return hasContent && hasMovieReferences;
    } catch (e) {
      return false;
    }
  });
  
  console.log(`📁 Found ${goodAnalyses.length} valid analyses, selecting ${limit}`);
  
  return goodAnalyses.slice(0, limit);
}

/**
 * Get movie index for reference
 */
function getMovieIndex() {
  if (!movieIndexes) return [];
  return Object.keys(movieIndexes.by_title).map(key => ({
    key,
    ...movieIndexes.by_title[key]
  }));
}

/**
 * Get person index for reference  
 */
function getPersonIndex() {
  if (!personIndexes) return [];
  return Object.keys(personIndexes.by_name).map(key => ({
    key,
    ...personIndexes.by_name[key]
  }));
}

export {
  initializeIndexes,
  processAnalysisContent,
  extractMovieMentions,
  lookupMovie,
  lookupPerson,
  extractContributors,
  getAnalysesFromBackup,
  getMovieIndex,
  getPersonIndex
};