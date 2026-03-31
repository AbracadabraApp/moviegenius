// Simple YES/NO counter - ignore errors, just count what works
const IDS = [3050, 3095, 3100, 3200, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000];

let yes = 0, no = 0;

for (const id of IDS) {
  try {
    const response = await fetch(`http://localhost:3002/api/movie-analysis?tmdbId=${id}`);
    const data = await response.json();
    const analysis = JSON.parse(data.analysis);
    const rec = analysis.whyWatch?.recommendation;
    
    if (rec === 'YES') yes++;
    else if (rec === 'NO') no++;
    
    console.log(`${id}: ${rec}`);
  } catch (e) {
    console.log(`${id}: ERROR`);
  }
  
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\nYES: ${yes}, NO: ${no}`);
console.log(`YES: ${(yes/(yes+no)*100).toFixed(1)}%`);