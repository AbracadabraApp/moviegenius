const fs = require('fs');

function generateMovieWebpage() {
  console.log('🎬 Generating movie URLs webpage...');

  // Read the clean movie URLs
  const movieData = JSON.parse(fs.readFileSync('clean-movie-urls.json', 'utf8'));
  console.log(`📊 Found ${movieData.length} movies to include`);

  // Read the HTML template
  let htmlContent = fs.readFileSync('movie-urls.html', 'utf8');

  // Generate the movie data JavaScript
  const movieDataJs = `window.movieData = ${JSON.stringify(movieData, null, 2)};
        
        // Auto-load the data when page loads
        document.addEventListener('DOMContentLoaded', function() {
            if (window.loadMovieData && window.movieData) {
                window.loadMovieData(window.movieData);
            }
        });`;

  // Insert the movie data into the HTML
  htmlContent = htmlContent.replace(
    '        // Movie URL data - will be populated by our generator\n        const movieData = [\n            // This will be filled by our script\n        ];',
    movieDataJs
  );

  // Update the total count
  htmlContent = htmlContent.replace(
    '<strong id="total-count">5801</strong>',
    `<strong id="total-count">${movieData.length}</strong>`
  );

  // Write the complete HTML file
  fs.writeFileSync('movie-urls-complete.html', htmlContent);

  console.log(`✅ Generated complete webpage: movie-urls-complete.html`);
  console.log(`🎯 Contains ${movieData.length} movie URLs`);
  console.log(`🔗 Sample URLs:`);
  movieData.slice(0, 3).forEach(movie => {
    console.log(`   ${movie.url} - ${movie.title}`);
  });

  return 'movie-urls-complete.html';
}

// Run if called directly
if (require.main === module) {
  generateMovieWebpage();
}

module.exports = { generateMovieWebpage };
