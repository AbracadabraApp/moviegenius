#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TRAILER_FILE = '/Users/josh.petersen/Documents/trailers.txt';

async function extractTrailerData() {
  console.log('🔍 Extracting trailer data from terminal output...');

  try {
    const content = fs.readFileSync(TRAILER_FILE, 'utf8');
    const lines = content.split('\n');

    const moviesWithTrailers = [];
    const moviesWithoutTrailers = [];

    let processedCount = 0;
    let trailerFoundCount = 0;
    let noTrailerCount = 0;

    for (const line of lines) {
      // Match movies with trailers: ✅ [batch] movie_id - NEW: trailer_id...
      const trailerMatch = line.match(/✅\s*\[(\d+)\]\s*(\d+)\s*-\s*NEW:\s*([a-zA-Z0-9_-]+)/);
      if (trailerMatch) {
        const [, batchNumber, movieId, trailerId] = trailerMatch;
        moviesWithTrailers.push({
          movieId: parseInt(movieId),
          trailerId: trailerId,
          batchNumber: parseInt(batchNumber),
        });
        trailerFoundCount++;
        processedCount++;
        continue;
      }

      // Match movies without trailers: 📝 [batch] movie_id - Description movie but no trailer!
      const noTrailerMatch = line.match(
        /📝\s*\[(\d+)\]\s*(\d+)\s*-\s*Description movie but no trailer!/
      );
      if (noTrailerMatch) {
        const [, batchNumber, movieId] = noTrailerMatch;
        moviesWithoutTrailers.push({
          movieId: parseInt(movieId),
          batchNumber: parseInt(batchNumber),
        });
        noTrailerCount++;
        processedCount++;
      }
    }

    console.log(`\n📊 Extraction Results:`);
    console.log(`Total processed entries: ${processedCount}`);
    console.log(`Movies with trailers found: ${trailerFoundCount}`);
    console.log(`Movies without trailers: ${noTrailerCount}`);

    // Analyze ID ranges
    const allIds = [
      ...moviesWithTrailers.map(m => m.movieId),
      ...moviesWithoutTrailers.map(m => m.movieId),
    ];
    const minId = Math.min(...allIds);
    const maxId = Math.max(...allIds);

    console.log(`\n🔢 ID Range Analysis:`);
    console.log(`Minimum movie ID: ${minId}`);
    console.log(`Maximum movie ID: ${maxId}`);
    console.log(`ID range: ${minId} - ${maxId}`);

    // Save extracted data
    const outputDir = path.join(__dirname, 'trailer-extraction');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Save movies with trailers
    const trailersFile = path.join(outputDir, 'movies-with-trailers.json');
    fs.writeFileSync(trailersFile, JSON.stringify(moviesWithTrailers, null, 2));
    console.log(`\n✅ Saved ${trailerFoundCount} movies with trailers to: ${trailersFile}`);

    // Save movies without trailers
    const noTrailersFile = path.join(outputDir, 'movies-without-trailers.json');
    fs.writeFileSync(noTrailersFile, JSON.stringify(moviesWithoutTrailers, null, 2));
    console.log(`✅ Saved ${noTrailerCount} movies without trailers to: ${noTrailersFile}`);

    // Create simple skip lists for easy lookup
    const skipListFile = path.join(outputDir, 'skip-lists.json');
    const skipLists = {
      moviesWithTrailers: moviesWithTrailers.map(m => m.movieId),
      moviesWithoutTrailers: moviesWithoutTrailers.map(m => m.movieId),
      processedRange: { min: minId, max: maxId },
      summary: {
        totalProcessed: processedCount,
        foundTrailers: trailerFoundCount,
        noTrailers: noTrailerCount,
        extractedAt: new Date().toISOString(),
      },
    };

    fs.writeFileSync(skipListFile, JSON.stringify(skipLists, null, 2));
    console.log(`✅ Saved skip lists to: ${skipListFile}`);

    // Sample data preview
    console.log(`\n🎬 Sample movies with trailers:`);
    moviesWithTrailers.slice(0, 3).forEach(movie => {
      console.log(`  Movie ID ${movie.movieId}: ${movie.trailerId}`);
    });

    console.log(`\n📝 Sample movies without trailers:`);
    moviesWithoutTrailers.slice(0, 3).forEach(movie => {
      console.log(`  Movie ID ${movie.movieId}: No trailer`);
    });

    return {
      moviesWithTrailers,
      moviesWithoutTrailers,
      skipLists,
    };
  } catch (error) {
    console.error('❌ Error extracting trailer data:', error.message);
    process.exit(1);
  }
}

// Run extraction
if (require.main === module) {
  extractTrailerData();
}

module.exports = { extractTrailerData };
