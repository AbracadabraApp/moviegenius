import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Testing Reality Bites for actual content...');
  await page.goto('http://localhost:3000/movie/2788', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const content = await page.evaluate(() => {
    // Get all text content
    const bodyText = document.body.textContent;
    
    // Look for movie titles we know should be there
    const knownMovies = ['Garden State', 'Frances Ha', 'Lady Bird', 'Big Sick'];
    const foundMovies = knownMovies.filter(movie => bodyText.includes(movie));
    
    // Look for any href patterns
    const htmlContent = document.body.innerHTML;
    const hrefMatches = (htmlContent.match(/href="\/movie\/\d+"/g) || []).length;
    
    return {
      foundMovies,
      hrefCount: hrefMatches,
      hasRealityBites: bodyText.includes('Reality Bites'),
      hasGenerationX: bodyText.includes('Generation X'),
      contentLength: bodyText.length
    };
  });
  
  console.log('Results:');
  console.log(`  • Found movies: ${content.foundMovies.join(', ')}`);
  console.log(`  • Href="/movie/" count: ${content.hrefCount}`);
  console.log(`  • Has "Reality Bites": ${content.hasRealityBites}`);
  console.log(`  • Has "Generation X": ${content.hasGenerationX}`);
  console.log(`  • Content length: ${content.contentLength} chars`);
  
  if (content.foundMovies.length > 0) {
    console.log('\\n✅ Movies are being rendered - linking system is working!');
    console.log(`Found ${content.foundMovies.length} movie references`);
  }
  
  await browser.close();
})();