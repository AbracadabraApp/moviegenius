import puppeteer from 'puppeteer';

async function testHydrationFlash() {
  const browser = await puppeteer.launch({ 
    headless: true, // Run headless for production testing
    devtools: false,
    slowMo: 0 // Fast for production testing
  });
  
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
  
  // Test movie 550 (Fight Club) in PRODUCTION
  console.log('🎬 Testing movie 550 (Fight Club) in PRODUCTION...');
  
  try {
    // Navigate and wait for network to be idle
    await page.goto('https://moviegenius.ai/movie/550', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Wait a bit more for any delayed hydration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we ended up on a 404 page
    const is404 = await page.evaluate(() => {
      return document.querySelector('meta[name="status"][content="404"]') !== null ||
             document.body.textContent.includes('404') ||
             document.body.textContent.includes('Page Not Found');
    });
    
    // Get the current URL to see if we were redirected
    const currentUrl = page.url();
    
    // Check if Fight Club content is present
    const hasFightClub = await page.evaluate(() => {
      return document.body.textContent.includes('Fight Club');
    });
    
    // Check for hydration errors in console
    const hydrationErrors = logs.filter(log => 
      log.includes('hydration') || 
      log.includes('Minified React error') ||
      log.includes('Warning: Text content did not match')
    );
    
    console.log('\n📊 RESULTS FOR MOVIE 550:');
    console.log(`URL: ${currentUrl}`);
    console.log(`Is 404 page: ${is404}`);
    console.log(`Has Fight Club content: ${hasFightClub}`);
    console.log(`Hydration errors: ${hydrationErrors.length}`);
    
    if (hydrationErrors.length > 0) {
      console.log('\n🚨 HYDRATION ERRORS:');
      hydrationErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (errors.length > 0) {
      console.log('\n🚨 PAGE ERRORS:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'movie-550-result.png', fullPage: true });
    console.log('📸 Screenshot saved: movie-550-result.png');
    
    // Test movie 11 (Star Wars) in PRODUCTION
    console.log('\n🎬 Testing movie 11 (Star Wars) in PRODUCTION...');
    
    // Clear previous logs
    logs.length = 0;
    errors.length = 0;
    
    await page.goto('https://moviegenius.ai/movie/11', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const is404StarWars = await page.evaluate(() => {
      return document.querySelector('meta[name="status"][content="404"]') !== null ||
             document.body.textContent.includes('404') ||
             document.body.textContent.includes('Page Not Found');
    });
    
    const currentUrlStarWars = page.url();
    
    const hasStarWars = await page.evaluate(() => {
      return document.body.textContent.includes('Star Wars');
    });
    
    const hydrationErrorsStarWars = logs.filter(log => 
      log.includes('hydration') || 
      log.includes('Minified React error') ||
      log.includes('Warning: Text content did not match')
    );
    
    console.log('\n📊 RESULTS FOR MOVIE 11:');
    console.log(`URL: ${currentUrlStarWars}`);
    console.log(`Is 404 page: ${is404StarWars}`);
    console.log(`Has Star Wars content: ${hasStarWars}`);
    console.log(`Hydration errors: ${hydrationErrorsStarWars.length}`);
    
    if (hydrationErrorsStarWars.length > 0) {
      console.log('\n🚨 HYDRATION ERRORS:');
      hydrationErrorsStarWars.forEach(error => console.log(`  - ${error}`));
    }
    
    await page.screenshot({ path: 'movie-11-result.png', fullPage: true });
    console.log('📸 Screenshot saved: movie-11-result.png');
    
    // Summary
    console.log('\n🏁 FINAL RESULTS:');
    const movie550Success = !is404 && hasFightClub && hydrationErrors.length === 0;
    const movie11Success = !is404StarWars && hasStarWars && hydrationErrorsStarWars.length === 0;
    
    console.log(`Movie 550 (Fight Club): ${movie550Success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Movie 11 (Star Wars): ${movie11Success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (movie550Success && movie11Success) {
      console.log('\n🎉 HYDRATION FLASH → 404 BUG APPEARS TO BE FIXED!');
    } else {
      console.log('\n⚠️ Issues still detected - hydration fix may need more work');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is available
async function checkPuppeteer() {
  try {
    await import('puppeteer');
    return true;
  } catch (error) {
    console.log('📦 Puppeteer not found. Installing...');
    const { execSync } = await import('child_process');
    try {
      execSync.execSync('npm install puppeteer', { stdio: 'inherit' });
      return true;
    } catch (installError) {
      console.error('❌ Failed to install Puppeteer:', installError.message);
      return false;
    }
  }
}

// Run the test
async function main() {
  console.log('🧪 Starting Hydration Flash Test...\n');
  
  const puppeteerAvailable = await checkPuppeteer();
  if (!puppeteerAvailable) {
    console.error('❌ Cannot run test without Puppeteer');
    process.exit(1);
  }
  
  await testHydrationFlash();
}

main().catch(console.error);