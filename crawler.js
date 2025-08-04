const puppeteer = require('puppeteer');
const fs = require('fs');

async function crawlMovieUrls() {
  console.log('Starting headless browser crawler...');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Navigate to the local HTML file
    const filePath = `file://${__dirname}/all-movie-urls.html`;
    console.log(`Loading file: ${filePath}`);

    await page.goto(filePath, { waitUntil: 'networkidle0' });

    console.log('Page loaded. Extracting movie URLs...');

    // Extract all movie URLs using the CSS selector
    const movieData = await page.evaluate(() => {
      const movieLinks = document.querySelectorAll('.movie-link');
      const movies = [];

      movieLinks.forEach((link, index) => {
        const url = link.href;
        const title = link.textContent.trim();
        const movieId = url.split('/movie/')[1];

        movies.push({
          number: index + 1,
          title: title,
          url: url,
          movieId: movieId,
        });
      });

      return movies;
    });

    console.log(`Extracted ${movieData.length} movie URLs`);

    // Save to JSON file
    const outputFile = 'extracted-movie-urls.json';
    fs.writeFileSync(outputFile, JSON.stringify(movieData, null, 2));
    console.log(`✅ Saved to ${outputFile}`);

    // Save URLs only to text file for easy copying
    const urlsOnly = movieData.map(movie => movie.url).join('\n');
    fs.writeFileSync('movie-urls-only.txt', urlsOnly);
    console.log(`✅ URLs saved to movie-urls-only.txt`);

    // Display first 5 and last 5 results
    console.log('\n🎬 First 5 movies:');
    movieData.slice(0, 5).forEach(movie => {
      console.log(`${movie.number}. ${movie.title} - ${movie.url}`);
    });

    console.log('\n🎬 Last 5 movies:');
    movieData.slice(-5).forEach(movie => {
      console.log(`${movie.number}. ${movie.title} - ${movie.url}`);
    });

    console.log(`\n📊 Total extracted: ${movieData.length} movies`);

    return movieData;
  } catch (error) {
    console.error('Error during crawling:', error);
  } finally {
    await browser.close();
  }
}

// Run the crawler
if (require.main === module) {
  crawlMovieUrls()
    .then(() => {
      console.log('✅ Crawling completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Crawling failed:', error);
      process.exit(1);
    });
}

module.exports = { crawlMovieUrls };
