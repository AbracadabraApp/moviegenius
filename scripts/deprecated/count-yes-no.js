// Simple YES/NO counter for movie recommendations
const TMDB_IDS = [
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
  7600, 7650, 7700, 7750, 7800, 7850, 7900, 7950, 8000, 8050
];

let yesCount = 0;
let noCount = 0;
let errorCount = 0;

async function getRecommendation(tmdbId) {
  try {
    const response = await fetch(`http://localhost:3002/api/movie-analysis?tmdbId=${tmdbId}`);
    const data = await response.json();
    
    if (!data.success) {
      console.log(`${tmdbId}: API failed - ${data.error || 'unknown error'}`);
      return 'API_ERROR';
    }
    
    const analysis = JSON.parse(data.analysis);
    const rec = analysis.whyWatch?.recommendation;
    
    if (!rec) {
      console.log(`${tmdbId}: No whyWatch.recommendation found - using old format`);
      return 'OLD_FORMAT';
    }
    
    return rec;
    
  } catch (error) {
    console.log(`${tmdbId}: Parse error - ${error.message}`);
    return 'PARSE_ERROR';
  }
}

async function countRecommendations() {
  console.log(`Testing ${TMDB_IDS.length} movies...`);
  
  for (let i = 0; i < TMDB_IDS.length; i++) {
    const id = TMDB_IDS[i];
    const rec = await getRecommendation(id);
    
    if (rec === 'YES') {
      yesCount++;
      console.log(`${id}: YES`);
    } else if (rec === 'NO') {
      noCount++;
      console.log(`${id}: NO`);
    } else {
      errorCount++;
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`${i + 1}/${TMDB_IDS.length} - YES:${yesCount} NO:${noCount} ERROR:${errorCount}`);
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\nFINAL COUNT:');
  console.log(`YES: ${yesCount}`);
  console.log(`NO: ${noCount}`);
  console.log(`ERROR: ${errorCount}`);
  
  const total = yesCount + noCount;
  if (total > 0) {
    console.log(`\nYES: ${((yesCount/total)*100).toFixed(1)}%`);
    console.log(`NO: ${((noCount/total)*100).toFixed(1)}%`);
  }
}

countRecommendations();