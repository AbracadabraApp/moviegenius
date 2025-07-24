/**
 * Resumable Movie Analysis Linking - Batch Processing
 * Processes nuclear static files in batches with progress tracking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BATCH_SIZE = 50; // Process 50 files per batch
const RATE_LIMIT_MS = 30; // Reduced from 50ms for faster processing
const PROGRESS_FILE = 'movie-analysis-progress.json';

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
 * Load or create progress tracking
 */
function loadProgress() {
  const progressPath = path.join(process.cwd(), PROGRESS_FILE);

  if (fs.existsSync(progressPath)) {
    try {
      return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    } catch (error) {
      console.log('⚠️ Progress file corrupted, starting fresh');
    }
  }

  return {
    processedFiles: new Set(),
    totalStats: {
      filesProcessed: 0,
      filesWithChanges: 0,
      totalPatterns: 0,
      totalLinked: 0,
      totalStripped: 0,
      startTime: Date.now(),
      lastBatchTime: Date.now(),
    },
    tmdbCache: new Map(),
    currentBatch: 0,
  };
}

/**
 * Save progress
 */
function saveProgress(progress) {
  const progressPath = path.join(process.cwd(), PROGRESS_FILE);

  // Convert Sets and Maps to arrays for JSON serialization
  const saveData = {
    processedFiles: Array.from(progress.processedFiles),
    totalStats: progress.totalStats,
    tmdbCache: Array.from(progress.tmdbCache.entries()),
    currentBatch: progress.currentBatch,
  };

  fs.writeFileSync(progressPath, JSON.stringify(saveData, null, 2));
}

/**
 * Restore progress from saved data
 */
function restoreProgress(saveData) {
  return {
    processedFiles: new Set(saveData.processedFiles || []),
    totalStats: saveData.totalStats || {
      filesProcessed: 0,
      filesWithChanges: 0,
      totalPatterns: 0,
      totalLinked: 0,
      totalStripped: 0,
      startTime: Date.now(),
      lastBatchTime: Date.now(),
    },
    tmdbCache: new Map(saveData.tmdbCache || []),
    currentBatch: saveData.currentBatch || 0,
  };
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
async function searchMovieInTMDB(title, year = null, tmdbCache) {
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
async function processMovieAnalysisContent(content, currentMovieTitle = '', tmdbCache) {
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

    const movieData = await searchMovieInTMDB(mention.title, mention.year, tmdbCache);

    if (movieData && movieData.tmdb_id) {
      // Create direct link to movie page
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

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
  }

  return { content: processedContent, stats };
}

/**
 * Process a single file
 */
async function processNuclearStaticFile(filePath, filename, tmdbCache) {
  try {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!fileData.props || !fileData.props.sections || !Array.isArray(fileData.props.sections)) {
      return { processed: false, stats: { total: 0, linked: 0, stripped: 0 } };
    }

    const processed = JSON.parse(JSON.stringify(fileData));
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
          tmdbCache
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
 * Process files in batches
 */
async function processBatch(files, batchStart, batchEnd, progress) {
  console.log(
    `\n📦 Processing batch ${progress.currentBatch + 1}: files ${batchStart + 1}-${Math.min(batchEnd, files.length)}`
  );

  const batchFiles = files.slice(batchStart, batchEnd);
  const nuclearDir = path.join(process.cwd(), 'nuclear-static');

  for (let i = 0; i < batchFiles.length; i++) {
    const filename = batchFiles[i];
    const globalIndex = batchStart + i;

    // Skip if already processed
    if (progress.processedFiles.has(filename)) {
      console.log(`[${globalIndex + 1}/${files.length}] ${filename} - already processed`);
      continue;
    }

    const filePath = path.join(nuclearDir, filename);
    console.log(`[${globalIndex + 1}/${files.length}] Processing ${filename}...`);

    const result = await processNuclearStaticFile(filePath, filename, progress.tmdbCache);

    // Update progress
    progress.processedFiles.add(filename);
    progress.totalStats.filesProcessed++;
    if (result.processed) {
      progress.totalStats.filesWithChanges++;
    }
    progress.totalStats.totalPatterns += result.stats.total;
    progress.totalStats.totalLinked += result.stats.linked;
    progress.totalStats.totalStripped += result.stats.stripped;

    if (result.stats.total > 0) {
      console.log(
        `  ✅ ${result.stats.linked} linked, ${result.stats.stripped} stripped (${result.stats.total} total)`
      );
    }
  }

  // Update batch info
  progress.currentBatch++;
  progress.totalStats.lastBatchTime = Date.now();

  // Save progress after each batch
  saveProgress(progress);

  // Show batch summary
  const elapsed = ((Date.now() - progress.totalStats.startTime) / 1000 / 60).toFixed(1);
  const rate = ((progress.totalStats.filesProcessed / (elapsed || 1)) * 60).toFixed(1);

  console.log(`\n📊 Batch ${progress.currentBatch} complete:`);
  console.log(`   • Files processed: ${progress.totalStats.filesProcessed}/${files.length}`);
  console.log(`   • Links created: ${progress.totalStats.totalLinked}`);
  console.log(`   • Cache size: ${progress.tmdbCache.size} movies`);
  console.log(`   • Elapsed time: ${elapsed} minutes`);
  console.log(`   • Processing rate: ${rate} files/minute`);

  return progress.totalStats.filesProcessed >= files.length;
}

/**
 * Main processing function
 */
async function processAllNuclearStaticFiles() {
  console.log('🚀 Resumable Movie Analysis Linking - Batch Processing');
  console.log(`📡 Using TMDB API Key: ${TMDB_API_KEY.substring(0, 8)}...`);
  console.log(`⚙️  Batch size: ${BATCH_SIZE} files, Rate limit: ${RATE_LIMIT_MS}ms\n`);

  const nuclearDir = path.join(process.cwd(), 'nuclear-static');

  if (!fs.existsSync(nuclearDir)) {
    console.error('❌ Nuclear directory not found');
    return;
  }

  const files = fs
    .readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json') && !f.endsWith('.backup'))
    .sort();

  console.log(`📁 Found ${files.length} nuclear static files`);

  // Load existing progress
  let progress = loadProgress();
  if (progress.processedFiles) {
    progress = restoreProgress(progress);
    console.log(
      `📈 Resuming from previous session: ${progress.processedFiles.size} files already processed`
    );
    console.log(`💾 TMDB cache loaded: ${progress.tmdbCache.size} movies`);
  }

  const startIndex = progress.processedFiles.size;
  const totalBatches = Math.ceil((files.length - startIndex) / BATCH_SIZE);

  console.log(`🎯 Starting from file ${startIndex + 1}, ${totalBatches} batches remaining\n`);

  // Process in batches
  for (let batchStart = startIndex; batchStart < files.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);

    try {
      const isComplete = await processBatch(files, batchStart, batchEnd, progress);

      if (isComplete) {
        break;
      }

      // Small pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Batch processing error:`, error);
      console.log('💾 Progress saved, you can resume with the same command');
      saveProgress(progress);
      throw error;
    }
  }

  // Final summary
  const totalTime = ((Date.now() - progress.totalStats.startTime) / 1000 / 60).toFixed(1);
  const successRate =
    progress.totalStats.totalPatterns > 0
      ? Math.round((progress.totalStats.totalLinked / progress.totalStats.totalPatterns) * 100)
      : 0;

  console.log(`\n🎉 Movie Analysis Linking Complete!`);
  console.log(`   • Files processed: ${progress.totalStats.filesProcessed}/${files.length}`);
  console.log(`   • Files modified: ${progress.totalStats.filesWithChanges}`);
  console.log(`   • Movie patterns found: ${progress.totalStats.totalPatterns}`);
  console.log(`   • Movie links created: ${progress.totalStats.totalLinked}`);
  console.log(`   • Marks stripped: ${progress.totalStats.totalStripped}`);
  console.log(`   • TMDB cache size: ${progress.tmdbCache.size} unique movies`);
  console.log(`   • Total time: ${totalTime} minutes`);
  console.log(`   • Success rate: ${successRate}%`);

  // Clean up progress file
  const progressPath = path.join(process.cwd(), PROGRESS_FILE);
  if (fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
    console.log(`🧹 Cleaned up progress file`);
  }

  return progress.totalStats;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏸️  Graceful shutdown requested...');
  console.log('💾 Progress has been saved. You can resume by running the script again.');
  process.exit(0);
});

// Run the processing
if (import.meta.url === `file://${process.argv[1]}`) {
  processAllNuclearStaticFiles()
    .then(stats => {
      console.log('\n✅ All nuclear static files processed successfully!');
      console.log('🌐 Movie analysis linking is now live across all pages');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Processing failed:', error);
      console.log('💾 Progress saved - you can resume by running the script again');
      process.exit(1);
    });
}
