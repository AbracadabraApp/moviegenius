// Script to find additional high-quality replacement movies
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
});

async function findMoreReplacements() {
  try {
    console.log('\n🔍 FINDING ADDITIONAL REPLACEMENT MOVIES\n');
    console.log('=' .repeat(80));

    // Read current movies and first batch of replacements to avoid
    const fs = require('fs');
    const curatedData = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/public/curated-film-ids.json', 'utf8'));
    const replacementData = JSON.parse(fs.readFileSync('replacement-movies.json', 'utf8'));
    
    const idsToAvoid = [
      ...curatedData.selectedIds,
      ...replacementData.replacementIds
    ];
    
    // Query for additional quality movies with good streaming
    const query = `
      SELECT DISTINCT
        tmdb_id,
        title,
        year,
        streaming_data,
        poster_url
      FROM movies 
      WHERE 
        streaming_data IS NOT NULL 
        AND streaming_data != ''
        AND LENGTH(streaming_data) - LENGTH(REPLACE(streaming_data, ',', '')) + 1 >= 2  -- At least 2 platforms
        AND tmdb_id::text NOT IN (${idsToAvoid.map(id => `'${id}'`).join(',')})
        AND year BETWEEN 1950 AND 2010  -- Focus on established classics
        AND poster_url IS NOT NULL
        AND title NOT LIKE '%XXX%'
        AND title NOT LIKE '%Sex%'
        AND title NOT LIKE '%Porn%'
        AND (
          -- Prioritize well-known classics and critically acclaimed films
          title ILIKE ANY(ARRAY[
            '%godfather%', '%citizen%', '%casablanca%', '%vertigo%', '%sunset%',
            '%some like%', '%north%', '%rear window%', '%taxi driver%', '%goodfellas%',
            '%apocalypse%', '%chinatown%', '%raging%', '%lawrence%', '%doctor%',
            '%bridge%', '%maltese%', '%third man%', '%bicycle%', '%rules%',
            '%8%', '%la strada%', '%nights%', '%wild%', '%persona%',
            '%silence%', '%pulp%', '%shawshank%', '%schindler%', '%one flew%'
          ])
          OR year IN (1939, 1941, 1942, 1950, 1954, 1957, 1958, 1960, 1962, 1972, 1974, 1975, 1976, 1980, 1994) -- Great film years
        )
      ORDER BY 
        LENGTH(streaming_data) - LENGTH(REPLACE(streaming_data, ',', '')) + 1 DESC,
        year ASC  -- Prefer older classics
      LIMIT 20
    `;

    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} additional potential replacements\n`);

    const additionalMovies = result.rows.map(movie => ({
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      streaming_data: movie.streaming_data,
      platformCount: movie.streaming_data.split(',').length,
      poster: movie.poster_url
    }));

    console.log(`🎬 ADDITIONAL QUALITY REPLACEMENT MOVIES:`);
    additionalMovies.forEach((movie, index) => {
      console.log(`   ${index + 1}. ${movie.title} (${movie.year}) - ${movie.platformCount} platforms - ID: ${movie.tmdbId}`);
    });

    // Combine with previous replacements
    const allReplacements = [
      ...replacementData.selectedReplacements,
      ...additionalMovies
    ];

    // Take exactly 28 movies to match removals
    const finalReplacements = allReplacements.slice(0, 28);

    console.log('\n' + '=' .repeat(80));
    console.log(`🎯 FINAL COMPLETE REPLACEMENT LIST (${finalReplacements.length} movies):`);
    finalReplacements.forEach((movie, index) => {
      console.log(`   ${index + 1}. ${movie.title} (${movie.year}) - ${movie.platformCount} platforms - ID: ${movie.tmdbId}`);
    });

    // Update replacement data
    const finalData = {
      selectedReplacements: finalReplacements,
      replacementIds: finalReplacements.map(movie => movie.tmdbId),
      summary: {
        totalSelected: finalReplacements.length,
        averagePlatforms: Math.round(finalReplacements.reduce((sum, movie) => sum + movie.platformCount, 0) / finalReplacements.length)
      }
    };

    fs.writeFileSync('final-replacement-movies.json', JSON.stringify(finalData, null, 2));
    console.log(`\n💾 Saved final replacement data to final-replacement-movies.json`);
    console.log(`📊 Average streaming platforms per replacement: ${finalData.summary.averagePlatforms}`);

    await pool.end();

  } catch (error) {
    console.error('Error finding additional replacements:', error);
    await pool.end();
  }
}

findMoreReplacements();