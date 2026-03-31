// Process TMDB IDs from file and count YES/NO recommendations
import fs from 'fs';

async function testSingleMovie(tmdbId) {
  try {
    const response = await fetch(`http://localhost:3002/api/movie-analysis?tmdbId=${tmdbId}`);
    
    if (!response.ok) {
      return { tmdbId, error: response.status };
    }
    
    const data = await response.json();
    
    if (!data.success || !data.analysis) {
      return { tmdbId, error: 'NO_ANALYSIS' };
    }
    
    // Try to parse as JSON
    try {
      const analysisData = JSON.parse(data.analysis);
      
      if (analysisData.whyWatch?.recommendation) {
        return {
          tmdbId,
          recommendation: analysisData.whyWatch.recommendation,
          success: true
        };
      } else {
        return { tmdbId, error: 'OLD_FORMAT' };
      }
    } catch (e) {
      return { tmdbId, error: 'PARSE_ERROR' };
    }
    
  } catch (error) {
    return { tmdbId, error: 'NETWORK' };
  }
}

async function processTMDBList(filename = 'tmdb-ids-random-200.json') {
  console.log(`Processing TMDB IDs from ${filename}...`);
  
  if (!fs.existsSync(filename)) {
    console.error(`File ${filename} not found. Run gather-tmdb-ids.js first.`);
    return;
  }
  
  const tmdbIds = JSON.parse(fs.readFileSync(filename, 'utf8'));
  console.log(`Loaded ${tmdbIds.length} TMDB IDs`);
  
  const counts = { YES: 0, NO: 0, ERROR: 0 };
  const errors = {};
  const results = [];
  
  let processed = 0;
  const batchSize = 5; // Process in smaller batches
  
  for (let i = 0; i < tmdbIds.length; i += batchSize) {
    const batch = tmdbIds.slice(i, i + batchSize);
    
    const promises = batch.map(tmdbId => testSingleMovie(tmdbId));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(result => {
      results.push(result);
      
      if (result.success && result.recommendation) {
        if (['YES', 'NO'].includes(result.recommendation)) {
          counts[result.recommendation]++;
          console.log(`✓ ${result.tmdbId}: ${result.recommendation}`);
        } else {
          counts.ERROR++;
          errors[result.recommendation] = (errors[result.recommendation] || 0) + 1;
        }
      } else {
        counts.ERROR++;
        const errorType = result.error || 'UNKNOWN';
        errors[errorType] = (errors[errorType] || 0) + 1;
        console.log(`✗ ${result.tmdbId}: ${errorType}`);
      }
    });
    
    processed += batch.length;
    
    console.log(`\n--- Progress: ${processed}/${tmdbIds.length} ---`);
    console.log(`YES: ${counts.YES} | NO: ${counts.NO} | ERROR: ${counts.ERROR}`);
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `recommendation-results-${timestamp}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({
    filename: filename,
    timestamp: timestamp,
    counts: counts,
    errors: errors,
    results: results
  }, null, 2));
  
  console.log(`\n🎯 FINAL RESULTS:`);
  console.log(`YES: ${counts.YES}`);
  console.log(`NO: ${counts.NO}`);
  console.log(`ERROR: ${counts.ERROR}`);
  
  const successful = counts.YES + counts.NO;
  if (successful > 0) {
    console.log(`\nSUCCESS RATE: ${successful}/${tmdbIds.length} (${((successful/tmdbIds.length)*100).toFixed(1)}%)`);
    console.log(`\nBINARY SPLIT:`);
    console.log(`YES: ${((counts.YES/successful)*100).toFixed(1)}%`);
    console.log(`NO: ${((counts.NO/successful)*100).toFixed(1)}%`);
  }
  
  if (Object.keys(errors).length > 0) {
    console.log(`\nERROR BREAKDOWN:`);
    Object.entries(errors).forEach(([error, count]) => {
      console.log(`${error}: ${count}`);
    });
  }
  
  console.log(`\nResults saved to: ${resultsFile}`);
  return { counts, errors, results };
}

// Allow specifying filename as command line argument
const filename = process.argv[2] || 'tmdb-ids-random-200.json';
processTMDBList(filename).catch(console.error);