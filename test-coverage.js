import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Testing movie linking coverage...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test sample of movies from different categories
  const testMovies = [
    { id: 544, name: "There's Something About Mary" },
    { id: 2788, name: "Reality Bites" },
    { id: 501979, name: "Bill & Ted Face the Music" },
    { id: 191, name: "The State I Am In" }
  ];
  
  const results = [];
  
  for (let movie of testMovies) {
    console.log(`\n📄 Testing ${movie.name} (TMDB ${movie.id})...`);
    
    try {
      await page.goto(`http://localhost:3000/movie/${movie.id}`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const linkingData = await page.evaluate(() => {
        // Method 1: Direct HTML links in analysis text
        const htmlLinks = Array.from(document.querySelectorAll('a[href*="/movie/"]')).map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          type: 'html_link'
        }));
        
        // Method 2: Featured Movies section
        const featuredMovies = Array.from(document.querySelectorAll('[data-testid="featured-movie"], .featured-movie')).map(el => ({
          text: el.textContent.trim(),
          type: 'featured_movie'
        }));
        
        // Method 3: More Ideas section  
        const moreIdeas = Array.from(document.querySelectorAll('[data-testid="more-ideas"], .more-ideas')).map(el => ({
          text: el.textContent.trim(), 
          type: 'more_ideas'
        }));
        
        // Method 4: Any clickable movie references
        const movieReferences = Array.from(document.querySelectorAll('[data-tmdb-id], .movie-title')).map(el => ({
          text: el.textContent.trim(),
          tmdbId: el.getAttribute('data-tmdb-id'),
          type: 'movie_reference'
        }));
        
        // Check for analysis content presence
        const hasAnalysisContent = document.body.textContent.length > 5000;
        const isLoading = document.querySelector('.animate-pulse') !== null;
        
        return {
          htmlLinks,
          featuredMovies, 
          moreIdeas,
          movieReferences,
          hasAnalysisContent,
          isLoading,
          totalLinks: htmlLinks.length + featuredMovies.length + moreIdeas.length + movieReferences.length
        };
      });
      
      results.push({
        movie: movie.name,
        tmdbId: movie.id,
        ...linkingData
      });
      
      console.log(`  • HTML links: ${linkingData.htmlLinks.length}`);
      console.log(`  • Featured movies: ${linkingData.featuredMovies.length}`);
      console.log(`  • More ideas: ${linkingData.moreIdeas.length}`);
      console.log(`  • Movie references: ${linkingData.movieReferences.length}`);
      console.log(`  • Total links: ${linkingData.totalLinks}`);
      console.log(`  • Has analysis: ${linkingData.hasAnalysisContent}`);
      console.log(`  • Still loading: ${linkingData.isLoading}`);
      
    } catch (error) {
      console.log(`  ❌ Error testing ${movie.name}: ${error.message}`);
      results.push({
        movie: movie.name,
        tmdbId: movie.id,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log(`\n📊 Coverage Summary:`);
  const moviesWithLinks = results.filter(r => r.totalLinks && r.totalLinks > 0);
  console.log(`  • Movies tested: ${results.length}`);
  console.log(`  • Movies with links: ${moviesWithLinks.length}`);
  console.log(`  • Coverage rate: ${((moviesWithLinks.length/results.length)*100).toFixed(1)}%`);
  
  const avgLinksPerMovie = moviesWithLinks.reduce((sum, r) => sum + (r.totalLinks || 0), 0) / moviesWithLinks.length;
  console.log(`  • Average links per movie: ${avgLinksPerMovie.toFixed(1)}`);
  
  await browser.close();
})();