/**
 * Movie Analysis Linking System - V1 Standalone
 *
 * Processes movie analysis content to create proper movie links for static pages.
 * Uses database lookups and MediaCard logic for missing movies.
 *
 * Features:
 * - Detects **Movie Title** (Year) and **Movie Title** patterns
 * - Looks up TMDB IDs in database
 * - Uses MediaCard organic slug generation for missing movies
 * - Creates direct /movie/TMDB_ID links
 * - Strips ** marks as fallback for unlinked movies
 * - Batch processes static page content efficiently
 * - Self-reference prevention (movies don't link to themselves)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize supabase client lazily to avoid environment variable issues
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

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
 * Look up movie in database by title and optionally year
 */
async function lookupMovieInDB(title, year = null) {
  try {
    if (year) {
      // Try exact title + year match first
      const { data: exactMatch } = await getSupabaseClient()
        .from('movies')
        .select('tmdb_id, title, year, slug, poster_url')
        .eq('title', title)
        .eq('year', year)
        .single();

      if (exactMatch) {
        return exactMatch;
      }

      // Try case-insensitive title + year match
      const { data: fuzzyMatch } = await getSupabaseClient()
        .from('movies')
        .select('tmdb_id, title, year, slug, poster_url')
        .ilike('title', title)
        .eq('year', year)
        .single();

      if (fuzzyMatch) {
        return fuzzyMatch;
      }
    }

    // Try title-only match (get most recent if multiple)
    const { data: titleMatches } = await getSupabaseClient()
      .from('movies')
      .select('tmdb_id, title, year, slug, poster_url')
      .ilike('title', title)
      .order('year', { ascending: false })
      .limit(1);

    return titleMatches && titleMatches.length > 0 ? titleMatches[0] : null;
  } catch (error) {
    console.log(`No DB match for "${title}"${year ? ` (${year})` : ''}:`, error.message);
    return null;
  }
}

/**
 * Add movie to database using MediaCard logic with TMDB search
 */
async function addMovieToDatabase(title, year = null) {
  try {
    console.log(`🔍 Adding "${title}"${year ? ` (${year})` : ''} to database via TMDB...`);

    // Build TMDB search query
    const searchQuery = year ? `${title} ${year}` : title;
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}${year ? `&year=${year}` : ''}`;

    const tmdbResponse = await fetch(tmdbUrl);
    const tmdbData = await tmdbResponse.json();

    if (tmdbData.results && tmdbData.results.length > 0) {
      // Find best match (prefer exact year if specified)
      let bestMatch = tmdbData.results[0];

      if (year) {
        const yearMatch = tmdbData.results.find(movie => {
          const releaseYear = movie.release_date
            ? parseInt(movie.release_date.substring(0, 4))
            : null;
          return releaseYear === year;
        });
        if (yearMatch) {
          bestMatch = yearMatch;
        }
      }

      const movieYear = bestMatch.release_date
        ? parseInt(bestMatch.release_date.substring(0, 4))
        : year || new Date().getFullYear();

      // Generate organic slug using the organic slug API
      let slug = `${bestMatch.title} (${movieYear}) - Classic film`;
      try {
        const slugResponse = await fetch('/api/generate-organic-slug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: bestMatch.title, year: movieYear }),
        });
        const slugData = await slugResponse.json();
        if (slugData.slug) {
          slug = slugData.slug;
        }
      } catch (slugError) {
        console.log('Slug generation failed, using default');
      }

      // Insert into database
      const { data: newMovie, error } = await getSupabaseClient()
        .from('movies')
        .insert({
          title: bestMatch.title,
          year: movieYear,
          tmdb_id: bestMatch.id,
          slug: slug,
          poster_url: bestMatch.poster_path
            ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`
            : null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        return null;
      }

      console.log(`✅ Added "${bestMatch.title}" (${movieYear}) with TMDB ID ${bestMatch.id}`);
      return newMovie;
    }

    return null;
  } catch (error) {
    console.error(`Error adding "${title}"${year ? ` (${year})` : ''} to database:`, error);
    return null;
  }
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
 * Process a single analysis content string to add movie links
 */
async function processAnalysisContent(content, currentMovieTitle = '', context = '') {
  if (!content || typeof content !== 'string') return content;

  // SUBHEADs are now handled as separate sections, so don't process them here
  let processedContent = content;

  const mentions = extractMovieMentions(processedContent);
  if (mentions.length === 0) {
    // Return content with SUBHEAD formatting even if no movie mentions
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

    let movieData = await lookupMovieInDB(mention.title, mention.year);

    // If not in database, try to add it
    if (!movieData) {
      movieData = await addMovieToDatabase(mention.title, mention.year);
    }

    if (movieData && movieData.tmdb_id) {
      // Create direct link to movie page using existing movie-title class
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
        `⚠️  Stripped marks for "${mention.title}"${mention.year ? ` (${mention.year})` : ''} - no TMDB match`
      );
    }
  }

  console.log(`✅ Created ${linksCreated} links, stripped ${strippedCount} marks in ${context}`);
  return processedContent;
}

/**
 * Process movie analysis sections in a static page data structure
 */
async function processMovieAnalysis(staticPageData, context = '') {
  if (!staticPageData || !staticPageData.props) return staticPageData;

  const processed = JSON.parse(JSON.stringify(staticPageData)); // Deep clone
  const currentMovieTitle = processed.props.title || '';

  console.log(`\n🎬 Processing analysis for: ${currentMovieTitle} (${context})`);

  // Process sections
  if (processed.props.sections && Array.isArray(processed.props.sections)) {
    for (let i = 0; i < processed.props.sections.length; i++) {
      const section = processed.props.sections[i];

      if (section.type === 'text' && section.content) {
        processed.props.sections[i].content = await processAnalysisContent(
          section.content,
          currentMovieTitle,
          `${context} section ${i}`
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
          `${context} exploreFurther ${i}`
        );
      }
    }
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
export async function processStaticPages(testCount = 20, dryRun = false) {
  console.log('🚀 Movie Analysis Linking System - V1 Standalone');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Testing: ${testCount} static pages\n`);

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
        `${movieTitle} (${movieYear})`
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

export { extractMovieMentions, lookupMovieInDB, processAnalysisContent, splitContentAtSubheads };
