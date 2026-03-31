// Gather TMDB IDs from database range 3000-9000 and save to file
import { Client } from 'pg';
import fs from 'fs';

const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL required');
  }
  return new Client({ connectionString: dbUrl });
};

async function gatherTMDBIds() {
  const client = getRailwayClient();
  await client.connect();
  
  try {
    console.log('Gathering TMDB IDs from database...');
    
    const query = `
      SELECT tmdb_id, title, year 
      FROM movies 
      WHERE tmdb_id >= 3000 AND tmdb_id <= 9000 
      AND tmdb_id IS NOT NULL 
      AND title IS NOT NULL
      ORDER BY tmdb_id
    `;
    
    const result = await client.query(query);
    console.log(`Found ${result.rows.length} movies in range 3000-9000`);
    
    // Save full list
    const moviesList = result.rows.map(row => ({
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year
    }));
    
    fs.writeFileSync('tmdb-ids-3000-9000.json', JSON.stringify(moviesList, null, 2));
    console.log('Saved full list to tmdb-ids-3000-9000.json');
    
    // Save just IDs for quick processing
    const idsOnly = result.rows.map(row => row.tmdb_id);
    fs.writeFileSync('tmdb-ids-only.json', JSON.stringify(idsOnly, null, 2));
    console.log('Saved IDs only to tmdb-ids-only.json');
    
    // Sample first 100 for testing
    const sample100 = idsOnly.slice(0, 100);
    fs.writeFileSync('tmdb-ids-sample-100.json', JSON.stringify(sample100, null, 2));
    console.log('Saved first 100 IDs to tmdb-ids-sample-100.json');
    
    // Random sample of 200
    const shuffled = [...idsOnly].sort(() => Math.random() - 0.5);
    const randomSample = shuffled.slice(0, 200);
    fs.writeFileSync('tmdb-ids-random-200.json', JSON.stringify(randomSample, null, 2));
    console.log('Saved random 200 IDs to tmdb-ids-random-200.json');
    
    console.log(`\nSummary:`);
    console.log(`- Total movies found: ${result.rows.length}`);
    console.log(`- Range: ${Math.min(...idsOnly)} to ${Math.max(...idsOnly)}`);
    console.log(`- Files created: 4 JSON files`);
    
    return result.rows;
    
  } finally {
    await client.end();
  }
}

gatherTMDBIds().catch(console.error);