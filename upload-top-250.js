/**
 * Upload Top 250 Movies Script
 * 
 * Uploads the best 250 movies from discovered-movies.json to the IMDb Top 250 list
 */

const fs = require('fs');
const path = require('path');

// Load movie data
const moviesPath = path.join(__dirname, 'data', 'discovered-movies.json');
const moviesData = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));

// Filter and sort movies to get best 250
const top250Movies = moviesData
  .filter(movie => 
    movie.tmdb_id && 
    movie.title && 
    movie.year && 
    movie.year >= 1920 && // Classic films onwards
    movie.year <= 2024    // Up to current year
  )
  .sort((a, b) => {
    // Sort by year desc, then alphabetically by title
    if (a.year !== b.year) return b.year - a.year;
    return a.title.localeCompare(b.title);
  })
  .slice(0, 250) // Take top 250
  .map((movie, index) => ({
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    poster_url: movie.poster_url,
    slug: movie.slug,
    streaming_data: movie.streaming_data
  }));

console.log(`Selected ${top250Movies.length} movies for upload`);
console.log('Sample movies:');
top250Movies.slice(0, 5).forEach((movie, i) => {
  console.log(`${i + 1}. ${movie.title} (${movie.year})`);
});

// The list ID from the production URL
const listId = 'a8c56f19-759f-4583-a519-d97dbe07db1d';
const productionUrl = 'https://moviegenius.ai';

async function uploadMovies(dryRun = true) {
  try {
    console.log(`\n${dryRun ? 'DRY RUN' : 'UPLOADING'}: Sending ${top250Movies.length} movies to production...`);
    
    const response = await fetch(`${productionUrl}/api/upload-list-movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listId: listId,
        movies: top250Movies,
        dryRun: dryRun
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    
    console.log('\n=== UPLOAD RESULTS ===');
    console.log(`List: ${result.summary.listName}`);
    console.log(`Total movies processed: ${result.summary.processed}/${result.summary.totalMovies}`);
    console.log(`Added: ${result.summary.added}`);
    console.log(`Already existed: ${result.summary.existing}`);
    console.log(`Errors: ${result.summary.errors}`);
    
    if (result.addedMovies && result.addedMovies.length > 0) {
      console.log('\nSample added movies:');
      result.addedMovies.slice(0, 5).forEach(movie => {
        console.log(`- ${movie.title} (${movie.year})`);
      });
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => {
        console.log(`- ${error.movie}: ${error.error}`);
      });
    }
    
    console.log(`\n${result.message}`);
    
    return result;
    
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}

// Run the script
async function main() {
  try {
    // First run a dry run
    console.log('=== DRY RUN ===');
    await uploadMovies(true);
    
    console.log('\n' + '='.repeat(50));
    console.log('Dry run completed successfully!');
    console.log('To actually upload the movies, run:');
    console.log('node upload-top-250.js --upload');
    
    // Check if --upload flag is provided
    if (process.argv.includes('--upload')) {
      console.log('\n=== ACTUAL UPLOAD ===');
      await uploadMovies(false);
      console.log('\nMovies uploaded successfully!');
      console.log('Check: https://moviegenius.ai/genius/list/a8c56f19-759f-4583-a519-d97dbe07db1d');
    }
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}

module.exports = { top250Movies, uploadMovies };