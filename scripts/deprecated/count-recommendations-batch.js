// Count Yes/Maybe/No recommendations for 1000 movies (IDs 3000-9000)
// Uses existing API infrastructure to test MOVIE_RECOMMENDATION_CONTEXT

import { Client } from 'pg';

const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL required');
  }
  return new Client({ connectionString: dbUrl });
};

async function getMoviesInRange(startId = 3000, endId = 9000, limit = 1000) {
  const client = getRailwayClient();
  await client.connect();
  
  try {
    const query = `
      SELECT tmdb_id, title, year 
      FROM movies 
      WHERE tmdb_id >= $1 AND tmdb_id <= $2 
      AND tmdb_id IS NOT NULL 
      AND title IS NOT NULL
      ORDER BY RANDOM()
      LIMIT $3
    `;
    
    const result = await client.query(query, [startId, endId, limit]);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function testMovieRecommendation(tmdbId) {
  try {
    const response = await fetch(`http://localhost:3001/api/movie-analysis?tmdbId=${tmdbId}`);
    
    if (!response.ok) {
      return { tmdbId, error: 'API_ERROR', status: response.status };
    }
    
    const data = await response.json();
    
    if (!data.success || !data.analysis) {
      return { tmdbId, error: 'NO_ANALYSIS' };
    }
    
    // Try to parse as JSON to check for new format
    try {
      const analysisData = JSON.parse(data.analysis);
      
      if (analysisData.whyWatch && analysisData.whyWatch.recommendation) {
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
    return { tmdbId, error: error.message };
  }
}

async function countRecommendations() {
  console.log('Getting movies from database...');
  const movies = await getMoviesInRange(3000, 9000, 1000);
  console.log(`Found ${movies.length} movies to test`);
  
  const counts = { YES: 0, MAYBE: 0, NO: 0, ERROR: 0 };
  const errors = {};
  
  let processed = 0;
  const batchSize = 10;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    
    const promises = batch.map(movie => testMovieRecommendation(movie.tmdb_id));
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      if (result.success && result.recommendation) {
        if (['YES', 'MAYBE', 'NO'].includes(result.recommendation)) {
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
    });
    
    processed += batch.length;
    
    if (processed % 50 === 0) {
      console.log(`${processed}/${movies.length} - YES:${counts.YES} MAYBE:${counts.MAYBE} NO:${counts.NO} ERROR:${counts.ERROR}`);
    }
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\nFINAL COUNTS:');
  console.log(`YES: ${counts.YES}`);
  console.log(`MAYBE: ${counts.MAYBE}`);
  console.log(`NO: ${counts.NO}`);
  console.log(`ERROR: ${counts.ERROR}`);
  
  if (Object.keys(errors).length > 0) {
    console.log('\nERROR BREAKDOWN:');
    Object.entries(errors).forEach(([error, count]) => {
      console.log(`${error}: ${count}`);
    });
  }
  
  const total = counts.YES + counts.MAYBE + counts.NO;
  if (total > 0) {
    console.log('\nPERCENTAGES:');
    console.log(`YES: ${((counts.YES/total)*100).toFixed(1)}%`);
    console.log(`MAYBE: ${((counts.MAYBE/total)*100).toFixed(1)}%`);
    console.log(`NO: ${((counts.NO/total)*100).toFixed(1)}%`);
  }
  
  return { counts, errors, total };
}

countRecommendations().catch(console.error);