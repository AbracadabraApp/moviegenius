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

async function investigateErrors() {
  console.log('🔍 Investigating error movies in detail...\n');

  // Error movies from the crawler output
  const errorMovies = [
    { title: 'A History of Violence', year: 2005 },
    { title: 'Twelve Monkeys', year: 1995 },
    { title: 'Memento', year: 2000 },
  ];

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const errorMovie of errorMovies) {
    console.log(`\n🎬 INVESTIGATING: ${errorMovie.title} (${errorMovie.year})`);
    console.log(`${'='.repeat(60)}`);

    // Find the movie in database
    const { data: movieData, error: findError } = await supabase
      .from('movies')
      .select('*')
      .eq('title', errorMovie.title)
      .eq('year', errorMovie.year)
      .single();

    if (findError || !movieData) {
      console.log(`❌ Movie not found in database: ${findError?.message || 'No results'}`);
      continue;
    }

    console.log(`✅ Found in database:`);
    console.log(`   ID: ${movieData.id}`);
    console.log(`   TMDB ID: ${movieData.tmdb_id}`);
    console.log(`   Title: ${movieData.title} (${movieData.year})`);
    console.log(`   Slug: ${movieData.slug || 'NULL'}`);
    console.log(`   Created: ${movieData.created_at}`);

    // Check analysis
    const { data: analysisData } = await supabase
      .from('movie_analyses')
      .select('*')
      .eq('movie_id', movieData.id);

    console.log(`   Analysis records: ${analysisData?.length || 0}`);

    if (analysisData?.length > 0) {
      analysisData.forEach((analysis, i) => {
        console.log(
          `     ${i + 1}. Type: ${analysis.analysis_type}, Created: ${analysis.created_at}`
        );
      });
    }

    // Test the URL
    const url = `https://moviegenius.ai/movie/${movieData.tmdb_id}`;
    console.log(`\n🌐 Testing URL: ${url}`);

    const page = await browser.newPage();

    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   🔴 Browser Error: ${msg.text()}`);
      }
    });

    // Enable response logging
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`   📡 Failed Request: ${response.status()} ${response.url()}`);
      }
    });

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      console.log(`   📡 HTTP Status: ${response.status()}`);

      if (response.status() === 200) {
        // Get detailed page analysis
        const pageAnalysis = await page.evaluate(() => {
          const body = document.body;
          const content = body.innerText || '';

          return {
            title: document.title,
            url: window.location.href,
            contentLength: content.length,
            contentPreview: content.substring(0, 500),
            hasError: content.toLowerCase().includes('error'),
            hasNotFound: content.toLowerCase().includes('not found'),
            has404: content.includes('404'),
            hasException: content.toLowerCase().includes('exception'),
            hasServerError: content.toLowerCase().includes('server error'),
            hasApiError: content.toLowerCase().includes('api'),
            hasClaudeError: content.toLowerCase().includes('claude'),
            hasLoading: content.toLowerCase().includes('loading'),
            hasExploreContent: content.includes('Explore Further'),
            hasMovieContent: content.toLowerCase().includes('movie'),
            bodyHtml: body.innerHTML.substring(0, 1000),
          };
        });

        console.log(`\n📄 Page Analysis:`);
        console.log(`   Title: "${pageAnalysis.title}"`);
        console.log(`   Content Length: ${pageAnalysis.contentLength} chars`);
        console.log(`   Has Error Text: ${pageAnalysis.hasError ? '❌' : '✅'}`);
        console.log(`   Has 404: ${pageAnalysis.has404 ? '❌' : '✅'}`);
        console.log(`   Has Exception: ${pageAnalysis.hasException ? '❌' : '✅'}`);
        console.log(`   Has Server Error: ${pageAnalysis.hasServerError ? '❌' : '✅'}`);
        console.log(`   Has Claude Error: ${pageAnalysis.hasClaudeError ? '❌' : '✅'}`);
        console.log(`   Has Loading: ${pageAnalysis.hasLoading ? '⏳' : '✅'}`);
        console.log(`   Has Explore Content: ${pageAnalysis.hasExploreContent ? '✅' : '❌'}`);
        console.log(`   Has Movie Content: ${pageAnalysis.hasMovieContent ? '✅' : '❌'}`);

        console.log(`\n📝 Content Preview:`);
        console.log(`   "${pageAnalysis.contentPreview}"`);

        if (pageAnalysis.hasError || pageAnalysis.has404 || pageAnalysis.hasException) {
          console.log(`\n🔍 HTML Preview (first 1000 chars):`);
          console.log(`   ${pageAnalysis.bodyHtml}`);
        }

        // Wait and check for dynamic content
        console.log(`\n⏳ Waiting 10 seconds for dynamic content...`);
        await new Promise(resolve => setTimeout(resolve, 10000));

        const dynamicAnalysis = await page.evaluate(() => {
          const content = document.body.innerText || '';
          return {
            newContentLength: content.length,
            hasExploreContent: content.includes('Explore Further'),
            hasMoreIdeas: content.includes('More Ideas'),
            contentChanged: true,
          };
        });

        console.log(`   Content after wait: ${dynamicAnalysis.newContentLength} chars`);
        console.log(
          `   Dynamic Explore Content: ${dynamicAnalysis.hasExploreContent ? '✅' : '❌'}`
        );
        console.log(`   Dynamic More Ideas: ${dynamicAnalysis.hasMoreIdeas ? '✅' : '❌'}`);

        // Check database changes after page visit
        const { data: updatedMovie } = await supabase
          .from('movies')
          .select('*')
          .eq('id', movieData.id)
          .single();

        const { data: newAnalysis } = await supabase
          .from('movie_analyses')
          .select('*')
          .eq('movie_id', movieData.id);

        const analysisChanged = (newAnalysis?.length || 0) > (analysisData?.length || 0);
        console.log(`\n📊 Database Changes:`);
        console.log(`   Slug changed: ${updatedMovie.slug !== movieData.slug ? '🔄' : '➡️'}`);
        console.log(`   New analysis: ${analysisChanged ? '✅' : '❌'}`);
      } else {
        console.log(`   ❌ Non-200 status: ${response.status()}`);
      }
    } catch (error) {
      console.log(`   💥 Page Error: ${error.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n✅ Investigation completed!`);
}

investigateErrors().catch(console.error);
