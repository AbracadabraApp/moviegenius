// Count Yes/Maybe/No recommendations for movies in range 3000-9000
// Tests existing analyses to see if they use the new format

const SAMPLE_TMDB_IDS = [
  // Generate sample IDs between 3000-9000
  3001, 3005, 3010, 3015, 3020, 3025, 3030, 3035, 3040, 3045,
  3050, 3055, 3060, 3065, 3070, 3075, 3080, 3085, 3090, 3095,
  3100, 3150, 3200, 3250, 3300, 3350, 3400, 3450, 3500, 3550,
  3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050,
  4100, 4150, 4200, 4250, 4300, 4350, 4400, 4450, 4500, 4550,
  4600, 4650, 4700, 4750, 4800, 4850, 4900, 4950, 5000, 5050,
  5100, 5150, 5200, 5250, 5300, 5350, 5400, 5450, 5500, 5550,
  5600, 5650, 5700, 5750, 5800, 5850, 5900, 5950, 6000, 6050,
  6100, 6150, 6200, 6250, 6300, 6350, 6400, 6450, 6500, 6550,
  6600, 6650, 6700, 6750, 6800, 6850, 6900, 6950, 7000, 7050,
  7100, 7150, 7200, 7250, 7300, 7350, 7400, 7450, 7500, 7550,
  7600, 7650, 7700, 7750, 7800, 7850, 7900, 7950, 8000, 8050,
  8100, 8150, 8200, 8250, 8300, 8350, 8400, 8450, 8500, 8550,
  8600, 8650, 8700, 8750, 8800, 8850, 8900, 8950
];

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

async function countRecommendations() {
  const counts = { YES: 0, NO: 0, ERROR: 0 };
  const errors = {};
  
  console.log(`Testing ${SAMPLE_TMDB_IDS.length} movie IDs...`);
  
  let processed = 0;
  
  for (const tmdbId of SAMPLE_TMDB_IDS) {
    const result = await testSingleMovie(tmdbId);
    
    if (result.success && result.recommendation) {
      if (['YES', 'NO'].includes(result.recommendation)) {
        counts[result.recommendation]++;
      } else {
        counts.ERROR++;
        errors[result.recommendation] = (errors[result.recommendation] || 0) + 1;
      }
    } else {
      counts.ERROR++;
      const errorType = result.error || 'UNKNOWN';
      errors[errorType] = (errors[errorType] || 0) + 1;
    }
    
    processed++;
    
    if (processed % 10 === 0) {
      process.stdout.write(`${processed}/${SAMPLE_TMDB_IDS.length} - YES:${counts.YES} NO:${counts.NO} ERROR:${counts.ERROR}\r`);
    }
    
    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n\nFINAL COUNTS:');
  console.log(`YES: ${counts.YES}`);
  console.log(`NO: ${counts.NO}`);
  console.log(`ERROR: ${counts.ERROR}`);
  
  const successful = counts.YES + counts.NO;
  if (successful > 0) {
    console.log('\nPERCENTAGES:');
    console.log(`YES: ${((counts.YES/successful)*100).toFixed(1)}%`);
    console.log(`NO: ${((counts.NO/successful)*100).toFixed(1)}%`);
  }
  
  return { counts, errors };
}

countRecommendations().catch(console.error);