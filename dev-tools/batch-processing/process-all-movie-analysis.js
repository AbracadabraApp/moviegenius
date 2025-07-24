/**
 * Process All Nuclear Static Files - Movie Analysis Linking
 * Production script to add movie links to all 5,700+ static pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    return envVars;
  }
  return {};
}

// Load environment variables
const envVars = loadEnvLocal();
const TMDB_API_KEY = envVars.TMDB_API_KEY || envVars.NEXT_PUBLIC_TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error('❌ TMDB API key not found in .env.local');
  process.exit(1);
}

/**
 * Extract movie mentions from content using **Movie Title** patterns
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];

  const mentions = [];

  // Pattern 1: **Movie Title** (Year)
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;

  while ((match = boldWithYearPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);

    mentions.push({
      original: match[0],
      title,
      year,
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold_with_year',
    });
  }

  // Pattern 2: **Movie Title** (without year)
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
 * Search for movie using TMDB API with caching
 */
const tmdbCache = new Map();

async function searchMovieInTMDB(title, year = null) {
  const cacheKey = `${title}|${year || 'no-year'}`;

  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }

  try {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    if (year) {
      url += `&year=${year}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    let result = null;

    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      result = {
        tmdb_id: movie.id,
        title: movie.title,
        year: new Date(movie.release_date).getFullYear(),
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
      };
    }

    tmdbCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error.message);
    tmdbCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Process content and create movie links
 */
async function processMovieAnalysisContent(content, currentMovieTitle = '', context = '') {
  if (!content || typeof content !== 'string')
    return { content, stats: { total: 0, linked: 0, stripped: 0 } };

  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) return { content, stats: { total: 0, linked: 0, stripped: 0 } };

  let processedContent = content;
  let stats = { total: mentions.length, linked: 0, stripped: 0 };

  // Process mentions in reverse order to maintain string positions
  for (const mention of mentions.reverse()) {
    // Skip self-referential links (case-insensitive)
    if (
      currentMovieTitle &&
      mention.title.toLowerCase().trim() === currentMovieTitle.toLowerCase().trim()
    ) {
      // Strip ** marks for self-references
      const stripped = mention.title;
      processedContent =
        processedContent.slice(0, mention.start) + stripped + processedContent.slice(mention.end);
      stats.stripped++;
      continue;
    }

    const movieData = await searchMovieInTMDB(mention.title, mention.year);

    if (movieData && movieData.tmdb_id) {
      // Create direct link to movie page using existing movie-title class
      const link = mention.year
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a>`;

      processedContent =
        processedContent.slice(0, mention.start) + link + processedContent.slice(mention.end);
      stats.linked++;
    } else {
      // Strip ** marks as fallback
      const stripped = mention.year ? `${mention.title} (${mention.year})` : mention.title;
      processedContent =
        processedContent.slice(0, mention.start) + stripped + processedContent.slice(mention.end);
      stats.stripped++;
    }

    // Rate limiting to avoid overwhelming TMDB API
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return { content: processedContent, stats };
}

/**
 * Process a single nuclear static file
 */
async function processNuclearStaticFile(filePath, filename) {
  try {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!fileData.props || !fileData.props.sections || !Array.isArray(fileData.props.sections)) {
      return { processed: false, stats: { total: 0, linked: 0, stripped: 0 } };
    }

    const processed = JSON.parse(JSON.stringify(fileData)); // Deep clone
    const currentMovieTitle = processed.props.title || '';
    let totalStats = { total: 0, linked: 0, stripped: 0 };
    let hasChanges = false;

    // Process sections
    for (let i = 0; i < processed.props.sections.length; i++) {
      const section = processed.props.sections[i];

      if (section.type === 'text' && section.content) {
        const result = await processMovieAnalysisContent(
          section.content,
          currentMovieTitle,
          `${filename} section ${i}`
        );

        if (result.content !== section.content) {
          processed.props.sections[i].content = result.content;
          hasChanges = true;
        }

        totalStats.total += result.stats.total;
        totalStats.linked += result.stats.linked;
        totalStats.stripped += result.stats.stripped;
      }
    }

    // Only write file if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, JSON.stringify(processed, null, 2));
    }

    return { processed: hasChanges, stats: totalStats };
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return { processed: false, stats: { total: 0, linked: 0, stripped: 0 } };
  }
}

/**
 * Process all nuclear static files
 */
async function processAllNuclearStaticFiles() {
  console.log('🚀 Movie Analysis Linking - Processing All Nuclear Static Files');
  console.log(`📡 Using TMDB API Key: ${TMDB_API_KEY.substring(0, 8)}...`);

  const nuclearDir = path.join(process.cwd(), 'nuclear-static');

  if (!fs.existsSync(nuclearDir)) {
    console.error('❌ Nuclear directory not found');
    return;
  }

  const files = fs
    .readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json') && !f.endsWith('.backup'))
    .sort();

  console.log(`📁 Found ${files.length} nuclear static files\n`);

  let totalStats = {
    filesProcessed: 0,
    filesWithChanges: 0,
    totalPatterns: 0,
    totalLinked: 0,
    totalStripped: 0,
    tmdbCacheSize: 0,
  };

  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(nuclearDir, filename);

    console.log(`[${i + 1}/${files.length}] Processing ${filename}...`);

    const result = await processNuclearStaticFile(filePath, filename);

    totalStats.filesProcessed++;
    if (result.processed) {
      totalStats.filesWithChanges++;
    }
    totalStats.totalPatterns += result.stats.total;
    totalStats.totalLinked += result.stats.linked;
    totalStats.totalStripped += result.stats.stripped;

    if (result.stats.total > 0) {
      console.log(
        `  ✅ ${result.stats.linked} linked, ${result.stats.stripped} stripped (${result.stats.total} total patterns)`
      );
    }

    // Progress updates every 100 files
    if ((i + 1) % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = ((i + 1) / elapsed).toFixed(1);
      console.log(`\n📊 Progress: ${i + 1}/${files.length} files (${rate} files/sec)`);
      console.log(`   Cache size: ${tmdbCache.size} movies`);
      console.log(`   Links created: ${totalStats.totalLinked}`);
    }
  }

  totalStats.tmdbCacheSize = tmdbCache.size;
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n🎯 Movie Analysis Linking Complete!`);
  console.log(`   • Files processed: ${totalStats.filesProcessed}`);
  console.log(`   • Files modified: ${totalStats.filesWithChanges}`);
  console.log(`   • Movie patterns found: ${totalStats.totalPatterns}`);
  console.log(`   • Movie links created: ${totalStats.totalLinked}`);
  console.log(`   • Marks stripped: ${totalStats.totalStripped}`);
  console.log(`   • TMDB cache size: ${totalStats.tmdbCacheSize} unique movies`);
  console.log(`   • Processing time: ${elapsedTime} seconds`);
  console.log(
    `   • Success rate: ${totalStats.totalPatterns > 0 ? Math.round((totalStats.totalLinked / totalStats.totalPatterns) * 100) : 0}%`
  );

  return totalStats;
}

// Run the processing
processAllNuclearStaticFiles()
  .then(stats => {
    console.log('\n✅ All nuclear static files processed successfully!');
    console.log('🌐 Movie analysis linking is now live across all pages');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Processing failed:', error);
    process.exit(1);
  });
