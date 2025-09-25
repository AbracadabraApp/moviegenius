/**
 * Universal Movie Analysis Linking System - V2 Railway PostgreSQL
 *
 * Universal movie and contributor linking system that works in both browser and Node.js contexts.
 * Uses Railway PostgreSQL exclusively for all database operations.
 *
 * Features:
 * - Detects **Movie Title** (Year) and **Movie Title** patterns
 * - Links to /movie/TMDB_ID format (ID-based, no slugs)
 * - Links contributors to /person/ID format using person database IDs
 * - Works in both browser and Node.js environments
 * - Uses Railway PostgreSQL for all database lookups
 * - Self-reference prevention (movies don't link to themselves)
 * - No external API dependencies (no slug generation, no TMDB calls)
 * - Environment detection for proper database connection handling
 */

import { getRailwayClient, getPool, PersonService, MovieService } from './railway-db.js';

// Environment detection
const isNode = typeof window === 'undefined';
const isBrowser = typeof window !== 'undefined';

// Database connection management is now handled by railway-db.js

/**
 * Extract movie mentions from movie analysis content
 * Handles **Movie Title** (Year) and **Movie Title** patterns
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];

  const mentions = [];

  // Pattern 1: **Movie Title** (Year) - Bold with year
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;

  while ((match = boldWithYearPattern.exec(content)) !== null) {
    let title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Remove year from title if it's already included (e.g., "Drive (2011)" -> "Drive")
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

  // Pattern 2: **Movie Title** - Bold without year
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
  boldWithoutYearPattern.lastIndex = 0; // Reset regex state

  while ((match = boldWithoutYearPattern.exec(content)) !== null) {
    const title = match[1].trim();

    // Check for overlap with bold+year patterns
    const overlaps = mentions.some(
      existing =>
        (match.index >= existing.start && match.index < existing.end) ||
        (existing.start >= match.index && existing.start < match.index + match[0].length)
    );

    if (!overlaps) {
      mentions.push({
        original: match[0],
        title,
        year: null, // No year specified
        start: match.index,
        end: match.index + match[0].length,
        type: 'bold_without_year',
      });
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Look up movie in Railway PostgreSQL database by title and optionally year
 * Only works in Node.js context - browser context should use API endpoints
 */
async function lookupMovieInDB(title, year = null, client = null) {
  if (isBrowser) {
    console.warn('Direct database lookup not available in browser context');
    return null;
  }
  
  try {
    if (year) {
      // Try exact title + year match first using MovieService
      const exactMovie = await MovieService.getMovie(title, year, client);
      if (exactMovie) {
        return {
          tmdb_id: exactMovie.tmdb_id,
          title: exactMovie.title,
          year: exactMovie.year,
          poster_url: exactMovie.poster_url
        };
      }
    }

    // For title-only search with fuzzy matching for common variations
    const shouldReleaseClient = !client;
    const dbClient = client || getPool();

    try {
      // 1. Try exact match first (fastest)
      let titleQuery = 'SELECT tmdb_id, title, year, poster_url FROM movies WHERE LOWER(title) = LOWER($1) ORDER BY year DESC LIMIT 1';
      let titleResult = await dbClient.query(titleQuery, [title]);

      if (titleResult.rows.length > 0) {
        return titleResult.rows[0];
      }

      // 2. Try without leading articles ("The ", "A ", "An ")
      const titleWithoutArticle = title.replace(/^(The|A|An)\s+/i, '');
      if (titleWithoutArticle !== title) {
        titleResult = await dbClient.query(titleQuery, [titleWithoutArticle]);
        if (titleResult.rows.length > 0) {
          return titleResult.rows[0];
        }
      }

      // 3. Try adding "The " prefix if not present
      if (!title.match(/^The\s+/i)) {
        titleResult = await dbClient.query(titleQuery, [`The ${title}`]);
        if (titleResult.rows.length > 0) {
          return titleResult.rows[0];
        }
      }

      // 4. Try accent-insensitive search
      // First try PostgreSQL unaccent extension if available
      try {
        titleQuery = 'SELECT tmdb_id, title, year, poster_url FROM movies WHERE LOWER(unaccent(title)) = LOWER(unaccent($1)) ORDER BY year DESC LIMIT 1';
        titleResult = await dbClient.query(titleQuery, [title]);
        if (titleResult.rows.length > 0) {
          return titleResult.rows[0];
        }
      } catch (unaccentError) {
        // unaccent extension not available, try manual approach
        const normalizeAccents = (str) => {
          return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        };

        const normalizedTitle = normalizeAccents(title);

        // Search for titles that match when accents are stripped
        titleQuery = `
          SELECT tmdb_id, title, year, poster_url
          FROM movies
          WHERE LOWER(translate(title, 'àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ', 'aaaaaaceeeeiiiinooooooouuuuyy')) =
                LOWER(translate($1, 'àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ', 'aaaaaaceeeeiiiinooooooouuuuyy'))
          ORDER BY year DESC
          LIMIT 1
        `;
        titleResult = await dbClient.query(titleQuery, [title]);
        if (titleResult.rows.length > 0) {
          return titleResult.rows[0];
        }
      }

      // 5. Final fallback: partial match for very close titles
      titleQuery = 'SELECT tmdb_id, title, year, poster_url FROM movies WHERE title ILIKE $1 ORDER BY year DESC LIMIT 1';
      titleResult = await dbClient.query(titleQuery, [`%${title}%`]);

      return titleResult.rows.length > 0 ? titleResult.rows[0] : null;
    } finally {
      if (shouldReleaseClient && client) {
        client.release();
      }
    }
  } catch (error) {
    console.log(`No DB match for "${title}"${year ? ` (${year})` : ''}:`, error.message);
    return null;
  }
}

/**
 * Look up person by name in Railway PostgreSQL database
 * Returns person data with ID for linking
 */
async function lookupPersonInDB(name, client = null) {
  if (isBrowser) {
    console.warn('Direct database lookup not available in browser context');
    return null;
  }
  
  try {
    // Use PersonService from railway-db.js
    return await PersonService.getPersonByName(name, client);
  } catch (error) {
    console.log(`No person found for "${name}":`, error.message);
    return null;
  }
}

/**
 * NO LONGER SUPPORTED: Adding movies to database
 * This linking system only works with existing movies in the database
 * Movie addition should be handled by separate import/sync processes
 */
function addMovieToDatabase(title, year = null) {
  console.log(`⚠️ Movie addition not supported - "${title}"${year ? ` (${year})` : ''} not found in database`);
  return null;
}

/**
 * Strip SUBHEADs from content entirely
 */
function splitContentAtSubheads(content) {
  if (!content || typeof content !== 'string') return [{ type: 'text', content }];

  // Simply remove all SUBHEAD lines
  const cleanedContent = content.replace(/\bSUBHEAD:\s*[^\n]+\n?/g, '');

  return [{ type: 'text', content: cleanedContent.trim() }];
}

/**
 * Extract contributors from keyElements in the same analysis
 * Supports multiple formats for maximum compatibility
 */
function extractContributorsFromKeyElements(rawContent) {
  if (!rawContent) return [];
  
  const contributors = [];
  
  // Format 1: KEY_CONTRIBUTORS: Director: Name, Writer: Name, Star: Name1, Name2
  const keyElementsMatch = rawContent.match(/KEY_CONTRIBUTORS:\s*(.*?)(?:\n|$)/);
  
  if (keyElementsMatch) {
    const keyElementsText = keyElementsMatch[1];
    
    // Parse contributors from the KEY_CONTRIBUTORS line
    const roleMatches = keyElementsText.match(/(\w+):\s*([^:]+?)(?=\s*,?\s*\w+:|$)/g);
    
    if (roleMatches) {
      roleMatches.forEach(roleMatch => {
        const colonIndex = roleMatch.indexOf(':');
        const role = roleMatch.substring(0, colonIndex).trim();
        const namesText = roleMatch.substring(colonIndex + 1).trim();
        
        const names = namesText.split(',').map(name => name.trim()).filter(name => name && name.length > 0);
        
        names.forEach(name => {
          if (name && !contributors.find(c => c.name === name)) {
            contributors.push({ name, role: role.toLowerCase() });
          }
        });
      });
    }
  }
  
  console.log(`📋 Extracted ${contributors.length} contributors from keyElements:`, contributors.map(c => c.name));
  return contributors;
}

/**
 * Find first mention of each contributor name in content
 */
function findContributorMentions(content, contributors) {
  const mentions = [];
  
  contributors.forEach(contributor => {
    // Look for first mention of the contributor's name
    const nameRegex = new RegExp(`\\b${contributor.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = content.match(nameRegex);
    
    if (match) {
      const startIndex = content.indexOf(match[0]);
      mentions.push({
        name: contributor.name,
        role: contributor.role,
        original: match[0],
        start: startIndex,
        end: startIndex + match[0].length
      });
    }
  });
  
  // Sort by position in text to process in order
  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Process contributor mentions and add person links using database IDs
 * Only works in Node.js context with database access
 */
async function processContributorMentions(content, contributors, client = null) {
  if (isBrowser) {
    console.log('⚠️ Contributor linking requires Node.js context with database access');
    return content;
  }
  
  if (!contributors || contributors.length === 0) {
    return content;
  }
  
  let processedContent = content;
  const contributorMentions = findContributorMentions(content, contributors);
  
  if (contributorMentions.length === 0) {
    return content;
  }
  
  console.log(`👥 Processing ${contributorMentions.length} contributor mentions`);
  
  // Process mentions in reverse order to avoid position shifts
  for (let i = contributorMentions.length - 1; i >= 0; i--) {
    const mention = contributorMentions[i];
    
    try {
      const personData = await lookupPersonInDB(mention.name, client);
      
      if (personData && personData.id) {
        // Create person link with database ID
        const link = `<a href="/person/${personData.id}" class="person-name">${mention.original}</a>`;
        
        // Replace the mention
        const before = processedContent.substring(0, mention.start);
        const after = processedContent.substring(mention.end);
        processedContent = before + link + after;
        
        console.log(`🔗 Linked contributor "${mention.name}" → /person/${personData.id}`);
      } else {
        console.log(`   ⚠️ Person not found: ${mention.name}`);
      }
    } catch (error) {
      console.log(`   ❌ Error linking ${mention.name}: ${error.message}`);
    }
  }
  
  return processedContent;
}

/**
 * Process a single analysis content string to add movie and contributor links
 * By default, processes both movies and contributors for comprehensive linking
 */
async function processAnalysisContent(content, currentMovieTitle = '', context = '', rawContent = '', options = {}) {
  if (!content || typeof content !== 'string') return content;

  // Default: process both movies and contributors (can be disabled via options)
  const { processMovies = true, processContributors = true } = options;

  // SUBHEADs are now handled as separate sections, so don't process them here
  let processedContent = content;

  // Step 1: Add contributor links first (Node.js only)
  if (processContributors && isNode) {
    let contributors = [];

    // Use contributors passed directly in options (preferred)
    if (options.contributors && Array.isArray(options.contributors)) {
      contributors = options.contributors;
    }
    // Fallback to extracting from rawContent
    else if (rawContent) {
      contributors = extractContributorsFromKeyElements(rawContent);
    }

    if (contributors.length > 0) {
      console.log(`👥 Processing ${contributors.length} contributors in ${context}`);
      processedContent = await processContributorMentions(processedContent, contributors, options.dbClient);
    }
  } else if (processContributors && isBrowser) {
    console.log('⚠️ Contributor linking not available in browser context');
  }

  // Step 2: Process movie links as before
  if (processMovies) {
    const mentions = extractMovieMentions(processedContent);
    if (mentions.length === 0) {
      // Return content even if no movie mentions
      return processedContent;
    }

    console.log(`📖 Processing ${mentions.length} movie mentions in ${context}`);

    let linksCreated = 0;
    let strippedCount = 0;

  // Process mentions by replacing the original patterns directly (safer than position-based)
  for (const mention of mentions) {
    // Skip self-referential links (case-insensitive)
    if (
      currentMovieTitle &&
      mention.title.toLowerCase().trim() === currentMovieTitle.toLowerCase().trim()
    ) {
      console.log(`🚫 Skipping self-reference: "${mention.title}"`);
      // Strip ** marks for self-references but keep year if present
      const stripped = mention.year 
        ? `${mention.title} (${mention.year})`
        : mention.title;
      processedContent = processedContent.replace(mention.original, stripped);
      strippedCount++;
      continue;
    }

    let movieData = null;
    
    // Only attempt database lookup in Node.js context
    if (isNode) {
      movieData = await lookupMovieInDB(mention.title, mention.year, options.dbClient);
    } else {
      console.log('⚠️ Movie database lookup not available in browser context');
    }
    
    // No longer support adding movies to database
    // Movies should be imported/synced via separate processes

    if (movieData && movieData.tmdb_id) {
      // Create direct link to movie page using TMDB ID
      const link = mention.year
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a>`;

      processedContent = processedContent.replace(mention.original, link);
      linksCreated++;

      console.log(
        `🔗 Linked "${mention.title}"${mention.year ? ` (${mention.year})` : ''} → /movie/${movieData.tmdb_id}`
      );
    } else {
      // Strip ** marks as fallback
      const stripped = mention.year ? `${mention.title} (${mention.year})` : mention.title;
      processedContent = processedContent.replace(mention.original, stripped);
      strippedCount++;

      console.log(
        `⚠️  Stripped marks for "${mention.title}"${mention.year ? ` (${mention.year})` : ''} - not found in database`
      );
    }
  }

    console.log(`✅ Created ${linksCreated} links, stripped ${strippedCount} marks in ${context}`);
  }

  return processedContent;
}

/**
 * Process movie analysis sections in a static page data structure
 * Works with shared database connection in Node.js context
 */
async function processMovieAnalysis(staticPageData, context = '', options = {}) {
  if (!staticPageData || !staticPageData.props) return staticPageData;

  const processed = JSON.parse(JSON.stringify(staticPageData)); // Deep clone
  const currentMovieTitle = processed.props.title || '';
  
  // Get the raw content for keyElements extraction
  const rawContent = processed.props.rawAnalysis || '';

  console.log(`\n🎬 Processing analysis for: ${currentMovieTitle} (${context})`);

  // Create shared database connection for Node.js context
  let dbClient = null;
  if (isNode && !options.dbClient) {
    try {
      dbClient = getPool();
      options.dbClient = dbClient;
    } catch (error) {
      console.warn('Failed to connect to database pool:', error.message);
    }
  }

  try {
    // Process sections
    if (processed.props.sections && Array.isArray(processed.props.sections)) {
      for (let i = 0; i < processed.props.sections.length; i++) {
        const section = processed.props.sections[i];

        if (section.type === 'text' && section.content) {
          processed.props.sections[i].content = await processAnalysisContent(
            section.content,
            currentMovieTitle,
            `${context} section ${i}`,
            rawContent,
            options
          );
        }
      }
    }

    // Process exploreFurther
    if (processed.props.exploreFurther && Array.isArray(processed.props.exploreFurther)) {
      for (let i = 0; i < processed.props.exploreFurther.length; i++) {
        const item = processed.props.exploreFurther[i];

        if (item.content) {
          processed.props.exploreFurther[i].content = await processAnalysisContent(
            item.content,
            currentMovieTitle,
            `${context} exploreFurther ${i}`,
            rawContent,
            options
          );
        }
      }
    }
  } finally {
    // Note: Pool connections are managed by railway-db.js, no need to close
    // Individual client releases are handled within each service call
  }

  return processed;
}

/**
 * Get list of static movie pages from nuclear static cache
 */
async function getStaticMoviePages(limit = 20) {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const nuclearDir = path.join(process.cwd(), 'public', 'nuclear-static');

    if (!fs.existsSync(nuclearDir)) {
      console.log('Nuclear static directory not found');
      return [];
    }

    const allFiles = fs
      .readdirSync(nuclearDir)
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => parseInt(a.replace('.json', '')) - parseInt(b.replace('.json', '')));

    console.log(`📁 Scanning ${allFiles.length} files for unprocessed ones...`);

    const files = [];
    for (const filename of allFiles) {
      if (files.length >= limit) break;

      const filePath = path.join(nuclearDir, filename);
      const tmdbId = parseInt(filename.replace('.json', ''));

      // Check if file is already processed
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const hasLinks =
          content.includes('<a href="/movie/') && content.includes('class="movie-title"');

        if (!hasLinks) {
          files.push({ tmdbId, filename });
        }
      } catch (error) {
        console.log(`⚠️ Error reading ${filename}: ${error.message}`);
      }
    }

    console.log(`🎯 Found ${files.length} unprocessed files (from ${allFiles.length} total)`);

    return files;
  } catch (error) {
    console.error('Error fetching static pages:', error);
    return [];
  }
}

/**
 * Check if a static page has already been processed for movie links
 */
function isPageAlreadyProcessed(staticPageData) {
  if (!staticPageData || !staticPageData.props || !staticPageData.props.sections) {
    return false;
  }

  // Check if any text sections contain HTML movie links
  for (const section of staticPageData.props.sections) {
    if (section.type === 'text' && section.content) {
      if (
        section.content.includes('<a href="/movie/') &&
        section.content.includes('class="movie-title"')
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Load static page data from nuclear static cache
 */
async function loadStaticPageData(tmdbId) {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'public', 'nuclear-static', `${tmdbId}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`No nuclear static file for TMDB ID ${tmdbId}`);
      return null;
    }

    const staticData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Validate structure
    if (!staticData.props || !staticData.props.title) {
      console.error(`Invalid static data structure for TMDB ID ${tmdbId}`);
      return null;
    }

    return staticData;
  } catch (error) {
    console.error(`Error loading static page data for ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Main function to process static pages with movie analysis linking
 */
export async function processStaticPages(testCount = 20, dryRun = false, options = {}) {
  const { processMovies = true, processContributors = true } = options;
  
  console.log('🚀 Movie Analysis Linking System - V1 Standalone');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Testing: ${testCount} static pages`);
  console.log(`Movies: ${processMovies ? 'Enabled' : 'Disabled'}, Contributors: ${processContributors ? 'Enabled' : 'Disabled'}\n`);

  const movies = await getStaticMoviePages(testCount);
  console.log(`📁 Found ${movies.length} static pages with analysis`);

  let totalProcessed = 0;
  let totalLinksCreated = 0;
  let totalErrors = 0;

  for (const movie of movies) {
    try {
      const staticPageData = await loadStaticPageData(movie.tmdbId);
      if (!staticPageData) {
        console.log(`⚠️  No static data for TMDB ${movie.tmdbId}`);
        continue;
      }

      const movieTitle = staticPageData.props.title;
      const movieYear = staticPageData.props.year;

      console.log(`\n📄 Processing: ${movieTitle} (${movieYear}) - TMDB ${movie.tmdbId}`);

      const processedData = await processMovieAnalysis(
        staticPageData,
        `${movieTitle} (${movieYear})`,
        { processMovies, processContributors }
      );

      if (!dryRun) {
        // Update the nuclear static cache file
        const fs = await import('fs');
        const path = await import('path');

        const filePath = path.join(process.cwd(), 'public', 'nuclear-static', `${movie.tmdbId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(processedData, null, 2));

        console.log(`💾 Updated static cache for TMDB ${movie.tmdbId}`);
      }

      totalProcessed++;

      // Rate limiting to avoid overwhelming TMDB API
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`❌ Error processing ${movie.title}:`, error.message);
      totalErrors++;
    }
  }

  console.log(`\n📊 Processing Complete:`);
  console.log(`  • Pages processed: ${totalProcessed}/${movies.length}`);
  console.log(`  • Errors: ${totalErrors}`);
  console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Data updated'}`);

  return { totalProcessed, totalLinksCreated, totalErrors };
}

/**
 * Test the system on sample content
 */
export async function testMovieAnalysisLinking(content, currentMovie = '') {
  console.log('🧪 Testing Movie Analysis Linking');
  console.log('================================\n');

  const mentions = extractMovieMentions(content);
  console.log(`Found ${mentions.length} movie mentions:`);

  mentions.forEach((mention, index) => {
    console.log(
      `${index + 1}. ${mention.type}: "${mention.title}"${mention.year ? ` (${mention.year})` : ''}`
    );
  });

  console.log('\nProcessing content...\n');
  const processedContent = await processAnalysisContent(content, currentMovie, 'test');

  console.log('Processed content:');
  console.log(processedContent);

  return processedContent;
}

// Core exports for universal linking system
export { 
  extractMovieMentions, 
  lookupMovieInDB, 
  lookupPersonInDB,
  processAnalysisContent, 
  processContributorMentions,
  splitContentAtSubheads,
  extractContributorsFromKeyElements,
  findContributorMentions,
  processMovieAnalysis,
  getRailwayClient,
  isNode,
  isBrowser
};
