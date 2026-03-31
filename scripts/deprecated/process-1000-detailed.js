// Process 1000 TMDB IDs with detailed output and cost tracking
import fs from 'fs';

const tmdbIds = JSON.parse(fs.readFileSync('tmdb-ids-1000.json', 'utf8'));

let yesCount = 0;
let noCount = 0;
let totalTime = 0;
let totalCost = 0;
let processedCount = 0;

console.log('Processing 1000 TMDB IDs with MOVIE_RECOMMENDATION_CONTEXT\n');

for (const id of tmdbIds) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`http://localhost:3002/api/movie-analysis?tmdbId=${id}`);
    const data = await response.json();
    
    if (!data.success) {
      console.log(`${id}: ERROR - ${data.error || 'API failed'}`);
      continue;
    }
    
    const analysis = JSON.parse(data.analysis);
    const movieTitle = analysis.metadata?.title || 'Unknown Title';
    const recommendation = analysis.whyWatch?.recommendation;
    const reasons = analysis.whyWatch?.reasons || [];
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Extract cost info if available
    const cost = data.cost || 0;
    
    if (recommendation === 'YES' || recommendation === 'NO') {
      // Success - display results
      console.log(`${movieTitle} (${id}): ${recommendation}`);
      reasons.forEach(reason => {
        console.log(`  • ${reason}`);
      });
      console.log(`  Time: ${duration.toFixed(2)}s | Cost: $${cost.toFixed(4)}\n`);
      
      if (recommendation === 'YES') yesCount++;
      else noCount++;
      
      totalTime += duration;
      totalCost += cost;
      processedCount++;
    } else {
      console.log(`${movieTitle} (${id}): ERROR - No valid recommendation\n`);
    }
    
  } catch (error) {
    console.log(`${id}: ERROR - ${error.message}\n`);
  }
  
  // Brief pause to avoid overwhelming the API
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Final report
console.log('='.repeat(60));
console.log('FINAL REPORT');
console.log('='.repeat(60));

const total = yesCount + noCount;
console.log(`Successfully processed: ${processedCount}/1000 movies`);
console.log(`YES: ${yesCount} (${total > 0 ? ((yesCount/total)*100).toFixed(1) : 0}%)`);
console.log(`NO: ${noCount} (${total > 0 ? ((noCount/total)*100).toFixed(1) : 0}%)`);
console.log(`Total time: ${(totalTime/60).toFixed(1)} minutes`);
console.log(`Total cost: $${totalCost.toFixed(2)}`);

if (processedCount > 0) {
  const avgTimePerMovie = totalTime / processedCount;
  const avgCostPerMovie = totalCost / processedCount;
  
  console.log(`Average per movie: ${avgTimePerMovie.toFixed(2)}s, $${avgCostPerMovie.toFixed(4)}`);
  
  // Estimates for 16k movies
  const estimated16kTime = (avgTimePerMovie * 16000) / 60 / 60; // hours
  const estimated16kCost = avgCostPerMovie * 16000;
  
  console.log('\n16K MOVIE ESTIMATES:');
  console.log(`Estimated time: ${estimated16kTime.toFixed(1)} hours`);
  console.log(`Estimated cost: $${estimated16kCost.toFixed(0)}`);
}

console.log('='.repeat(60));