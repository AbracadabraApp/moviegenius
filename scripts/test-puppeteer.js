import puppeteer from 'puppeteer';

async function runTest() {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test multiple movie pages
  const testMovies = [544, 501979, 191, 2788]; // Sample from query + Reality Bites
  const results = [];
  
  for (let tmdbId of testMovies) {
    console.log(`\n📄 Testing movie TMDB ${tmdbId}...`);
    await page.goto(`http://localhost:3000/movie/${tmdbId}`, { waitUntil: 'networkidle0' });
    
    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🔍 Looking for movie links...');
    
    // Check for movie links in the rendered page
    const movieLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/movie/"]'));
      return links.map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        className: link.className
      }));
    });
    
    console.log(`Found ${movieLinks.length} movie links:`);
    movieLinks.forEach((link, i) => {
      console.log(`  ${i+1}. ${link.text} -> ${link.href}`);
    });
    
    // Check for specific movie mentions in text
    console.log('\n🎬 Searching page content for movie mentions...');
    const pageContent = await page.evaluate(() => {
      return document.body.textContent;
    });
    
    const movies = ['Garden State', 'Frances Ha', 'Lady Bird', 'Big Sick'];
    movies.forEach(movie => {
      if (pageContent.includes(movie)) {
        console.log(`  • ${movie} found in page content`);
      } else {
        console.log(`  • ${movie} NOT found in page content`);
      }
    });
    
    // Check if page is still loading
    const isLoading = await page.evaluate(() => {
      return document.querySelector('.animate-pulse') !== null;
    });
    
    console.log(`\n📊 Page status: ${isLoading ? 'Still loading' : 'Fully loaded'}`);
    
    // Get a sample of the actual rendered content
    const sampleContent = await page.evaluate(() => {
      const content = document.body.textContent;
      return content.substring(0, 500) + '...';
    });
    
    console.log('\n📝 Sample rendered content:');
    console.log(sampleContent);
  }
  
  await browser.close();
}

runTest().catch(console.error);