#!/usr/bin/env node

/**
 * Runner script to process ONLY unprocessed nuclear-static files
 */

import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local BEFORE importing anything else
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
    console.log('✅ Environment variables loaded from .env.local');
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    process.exit(1);
  }
}

// Load env vars first
loadEnvFile();

// Now import the movie linker
const { processStaticPages } = await import('./lib/movie-analysis-linker.js');

// Function to check if a file is already processed
function isFileProcessed(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    if (!data.props || !data.props.sections) {
      return false;
    }

    // Check if any text sections contain HTML movie links
    for (const section of data.props.sections) {
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
  } catch (error) {
    return false;
  }
}

// Get unprocessed files
function getUnprocessedFiles(limit = 20) {
  const nuclearDir = path.join(process.cwd(), 'nuclear-static');

  if (!fs.existsSync(nuclearDir)) {
    console.log('Nuclear static directory not found');
    return [];
  }

  const allFiles = fs
    .readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => parseInt(a.replace('.json', '')) - parseInt(b.replace('.json', '')));

  console.log(`📁 Scanning ${allFiles.length} total files for unprocessed ones...`);

  const unprocessedFiles = [];

  for (const filename of allFiles) {
    if (unprocessedFiles.length >= limit) break;

    const filePath = path.join(nuclearDir, filename);
    const tmdbId = parseInt(filename.replace('.json', ''));

    if (!isFileProcessed(filePath)) {
      unprocessedFiles.push({ tmdbId, filename });
    }
  }

  console.log(`🎯 Found ${unprocessedFiles.length} unprocessed files (requested: ${limit})`);
  return unprocessedFiles;
}

// Monkey patch the getStaticMoviePages function to use our unprocessed files
async function processUnprocessedPages(testCount = 20, dryRun = false) {
  console.log('🚀 Movie Analysis Linking System - Unprocessed Files Only');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Testing: ${testCount} unprocessed static pages\n`);

  const movies = getUnprocessedFiles(testCount);
  console.log(`📁 Found ${movies.length} unprocessed static pages with analysis`);

  if (movies.length === 0) {
    console.log('🎉 All files already processed!');
    return { totalProcessed: 0, totalLinksCreated: 0, totalErrors: 0 };
  }

  let totalProcessed = 0;
  let totalLinksCreated = 0;
  let totalErrors = 0;

  // Import the functions we need
  const { loadStaticPageData, processMovieAnalysis } = await import(
    './lib/movie-analysis-linker.js'
  );

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
        const filePath = path.join(process.cwd(), 'nuclear-static', `${movie.tmdbId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(processedData, null, 2));

        console.log(`💾 Updated static cache for TMDB ${movie.tmdbId}`);
      }

      totalProcessed++;

      // Rate limiting to avoid overwhelming TMDB API
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`❌ Error processing ${movie.tmdbId}:`, error.message);
      totalErrors++;
    }
  }

  console.log(`\n📊 Processing Complete:`);
  console.log(`  • Pages processed: ${totalProcessed}/${movies.length}`);
  console.log(`  • Errors: ${totalErrors}`);
  console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Data updated'}`);

  return { totalProcessed, totalLinksCreated, totalErrors };
}

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let testCount = 20; // default
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      testCount = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--all') {
      testCount = 10000; // Process all files
    } else if (arg === '--help') {
      console.log('Usage: node run-unprocessed-linker.js [options]');
      console.log('Options:');
      console.log('  --count=N     Process N unprocessed files (default: 20)');
      console.log('  --all         Process all unprocessed files');
      console.log('  --dry-run     Test mode - no files modified');
      console.log('  --help        Show this help');
      process.exit(0);
    }
  }

  console.log(`🚀 Starting movie linking process (unprocessed files only)...`);
  console.log(`📊 Processing ${testCount === 10000 ? 'ALL UNPROCESSED' : testCount} files`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}`);
  console.log('');

  try {
    const results = await processUnprocessedPages(testCount, dryRun);

    console.log('\n🎉 Movie linking completed!');
    console.log(`📈 Results: ${JSON.stringify(results, null, 2)}`);
  } catch (error) {
    console.error('❌ Error running movie linker:', error);
    process.exit(1);
  }
}

main();
