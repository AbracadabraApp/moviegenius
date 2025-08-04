const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs and errors
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  await page.goto('https://moviegenius.ai/movie/550', { waitUntil: 'networkidle0' });
  
  const pageInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      has404Meta: document.querySelector('meta[name="status"][content="404"]') !== null,
      bodyContains404: document.body.textContent.includes('404'),
      bodyContainsNotFound: document.body.textContent.includes('Page Not Found'),
      bodyContainsFightClub: document.body.textContent.includes('Fight Club'),
      refinedTestFrameworkPresent: typeof window.generateRefinedNextJsReport === 'function'
    };
  });
  
  console.log('=== PAGE ANALYSIS ===');
  console.log(JSON.stringify(pageInfo, null, 2));
  
  console.log('\n=== RECENT ERRORS ===');
  errors.slice(-5).forEach(error => console.log(error));
  
  console.log('\n=== REQUIRE ERRORS ===');
  const requireErrors = errors.filter(error => error.includes('require'));
  console.log(`Require errors: ${requireErrors.length}`);
  requireErrors.forEach(error => console.log(error));
  
  await browser.close();
})();