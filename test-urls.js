const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables manually
if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUrls() {
  console.log('🧪 Testing URL interactions and database...\n');
  
  // Get first 5 movies from our clean list
  const movieData = JSON.parse(fs.readFileSync('clean-movie-urls.json', 'utf8'));
  const testMovies = movieData.slice(0, 5);
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser so we can see what happens
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  for (const movie of testMovies) {
    console.log(`\n🎬 Testing: ${movie.title}`);
    console.log(`🔗 URL: ${movie.url}`);
    console.log(`🆔 Movie ID: ${movie.movieId}`);
    
    // Check current database state
    console.log(`\n📊 Database before visit:`);
    const { data: beforeData, error: beforeError } = await supabase
      .from('movies')
      .select('id, title, year, slug, created_at')
      .eq('id', movie.movieId)
      .single();
    
    if (beforeError) {
      console.log(`   ❌ Database error: ${beforeError.message}`);
    } else {
      console.log(`   ✅ Movie exists: ${beforeData.title} (${beforeData.year})`);
      console.log(`   📝 Slug: ${beforeData.slug || 'NULL'}`);
      console.log(`   📅 Created: ${beforeData.created_at}`);
    }
    
    // Check if analysis exists
    const { data: analysisData, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('id, analysis_type, claude_response')
      .eq('movie_id', movie.movieId)
      .eq('analysis_type', 'page_analysis');
    
    console.log(`   🧠 Analysis records: ${analysisData?.length || 0}`);
    
    // Visit the URL
    const page = await browser.newPage();
    
    try {
      console.log(`\n🌐 Visiting URL...`);
      const response = await page.goto(movie.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const status = response.status();
      console.log(`   📡 HTTP Status: ${status}`);
      
      if (status === 200) {
        // Check page content
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            contentLength: document.body.innerText.length,
            hasExploreContent: document.body.innerText.includes('Explore Further'),
            hasMovieContent: document.body.innerText.toLowerCase().includes('movie'),
            hasErrorText: document.body.innerText.toLowerCase().includes('error') || 
                         document.body.innerText.toLowerCase().includes('not found')
          };
        });
        
        console.log(`   📄 Page title: ${pageInfo.title}`);
        console.log(`   🔗 Final URL: ${pageInfo.url}`);
        console.log(`   📏 Content length: ${pageInfo.contentLength} chars`);
        console.log(`   🎯 Has 'Explore Further': ${pageInfo.hasExploreContent ? '✅' : '❌'}`);
        console.log(`   🎬 Has movie content: ${pageInfo.hasMovieContent ? '✅' : '❌'}`);
        console.log(`   ⚠️  Has error text: ${pageInfo.hasErrorText ? '❌' : '✅'}`);
        
        // Wait a bit for any background API calls
        console.log(`\n⏳ Waiting 5 seconds for background processing...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check database after visit
        console.log(`\n📊 Database after visit:`);
        const { data: afterData, error: afterError } = await supabase
          .from('movies')
          .select('id, title, year, slug, created_at, updated_at')
          .eq('id', movie.movieId)
          .single();
        
        if (afterError) {
          console.log(`   ❌ Database error: ${afterError.message}`);
        } else {
          const slugChanged = beforeData?.slug !== afterData.slug;
          console.log(`   📝 Slug: ${afterData.slug || 'NULL'} ${slugChanged ? '🔄 CHANGED' : ''}`);
          console.log(`   📅 Updated: ${afterData.updated_at || 'NULL'}`);
        }
        
        // Check for new analysis
        const { data: newAnalysisData } = await supabase
          .from('movie_analyses')
          .select('id, analysis_type, claude_response')
          .eq('movie_id', movie.movieId)
          .eq('analysis_type', 'page_analysis');
        
        const newAnalysisCount = newAnalysisData?.length || 0;
        const analysisCreated = newAnalysisCount > (analysisData?.length || 0);
        console.log(`   🧠 Analysis records: ${newAnalysisCount} ${analysisCreated ? '🆕 NEW' : ''}`);
        
        if (analysisCreated && newAnalysisData?.length > 0) {
          const latestAnalysis = newAnalysisData[newAnalysisData.length - 1];
          const content = latestAnalysis.claude_response?.raw_content || '';
          console.log(`   📄 Analysis preview: ${content.substring(0, 100)}...`);
        }
        
      }
      
    } catch (error) {
      console.log(`   ❌ Page error: ${error.message}`);
    }
    
    await page.close();
    console.log(`\n${'='.repeat(80)}`);
  }
  
  await browser.close();
  console.log(`\n✅ URL testing completed!`);
}

// Run the test
testUrls().catch(console.error);