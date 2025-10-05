// Crawler to check 5000 production pages for analysis content
import https from 'https';
import fs from 'fs';

async function fetchPage(tmdbId) {
  return new Promise((resolve) => {
    const url = `https://moviegenius.ai/movie/${tmdbId}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const hasAnalysis = data.includes('analysis') || data.includes('Why Watch') || data.includes('More Ideas');
        const hasHeader = data.includes('MovieHeaderLarge') || data.includes('<h1') || data.includes('movie-title');
        const hasFooter = data.includes('contributor') || data.includes('footer') || data.includes('cast');

        resolve({
          tmdbId,
          url,
          statusCode: res.statusCode,
          hasAnalysis,
          hasHeader,
          hasFooter,
          pageSize: data.length
        });
      });
    }).on('error', (err) => {
      resolve({
        tmdbId,
        url,
        statusCode: 'ERROR',
        error: err.message,
        hasAnalysis: false,
        hasHeader: false,
        hasFooter: false,
        pageSize: 0
      });
    });
  });
}

async function crawl5000Pages() {
  const results = [];
  const batchSize = 50;

  console.log('Starting crawl of 5000 movie pages...');
  console.log('Format: TMDB_ID | STATUS | ANALYSIS | HEADER | FOOTER | SIZE');
  console.log('='.repeat(70));

  for (let i = 1; i <= 5000; i += batchSize) {
    const batch = [];

    // Create batch of requests
    for (let j = i; j < i + batchSize && j <= 5000; j++) {
      batch.push(fetchPage(j));
    }

    // Execute batch concurrently
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    // Log progress
    batchResults.forEach(result => {
      const status = result.statusCode === 200 ? '200' : result.statusCode;
      const analysis = result.hasAnalysis ? 'YES' : 'NO';
      const header = result.hasHeader ? 'YES' : 'NO';
      const footer = result.hasFooter ? 'YES' : 'NO';
      const size = result.pageSize.toString().padStart(6);

      console.log(`${result.tmdbId.toString().padStart(5)} | ${status.toString().padStart(3)} | ${analysis.padStart(8)} | ${header.padStart(6)} | ${footer.padStart(6)} | ${size}`);
    });

    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 100));

    if (i % 500 === 1) {
      const analyzed = results.filter(r => r.hasAnalysis).length;
      const success = results.filter(r => r.statusCode === 200).length;
      console.log(`\n--- Progress: ${results.length}/5000 pages checked ---`);
      console.log(`--- Success: ${success}, With Analysis: ${analyzed} ---\n`);
    }
  }

  // Final summary
  const summary = {
    total: results.length,
    successful: results.filter(r => r.statusCode === 200).length,
    withAnalysis: results.filter(r => r.hasAnalysis).length,
    withHeader: results.filter(r => r.hasHeader).length,
    withFooter: results.filter(r => r.hasFooter).length,
    errors: results.filter(r => r.statusCode === 'ERROR').length,
    notFound: results.filter(r => r.statusCode === 404).length
  };

  console.log('\n' + '='.repeat(50));
  console.log('FINAL SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Total pages checked: ${summary.total}`);
  console.log(`Successful (200): ${summary.successful}`);
  console.log(`With Analysis: ${summary.withAnalysis}`);
  console.log(`With Header: ${summary.withHeader}`);
  console.log(`With Footer: ${summary.withFooter}`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Not Found (404): ${summary.notFound}`);
  console.log(`Analysis Coverage: ${((summary.withAnalysis / summary.successful) * 100).toFixed(1)}%`);

  // Save detailed results
  fs.writeFileSync('crawler-results.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('crawler-summary.json', JSON.stringify(summary, null, 2));

  console.log('\nDetailed results saved to: crawler-results.json');
  console.log('Summary saved to: crawler-summary.json');

  return summary;
}

// Run crawler
crawl5000Pages().catch(console.error);