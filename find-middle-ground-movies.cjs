// Find middle-ground movies from Rotten Tomatoes list that are in our database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
});

async function findMiddleGroundMovies() {
  try {
    console.log('\n🎬 FINDING MIDDLE-GROUND MOVIES FROM RT NETFLIX LIST\n');
    console.log('=' .repeat(80));

    // Read current curated list to avoid duplicates
    const fs = require('fs');
    const curatedData = JSON.parse(fs.readFileSync('/Users/josh.petersen/moviegenius/public/curated-film-ids.json', 'utf8'));
    const currentIds = curatedData.selectedIds.map(id => id.toString());
    
    // Movie titles from Rotten Tomatoes Netflix guide
    const rtMovies = [
      'Godzilla Minus One', 'Parasite', 'The Forty-Year-Old Version',
      'Under the Shadow', 'Miss Juneteenth', 'Will & Harper', 
      'His Three Daughters', 'Jaws', 'Mad Max: Fury Road',
      'I Lost My Body', 'Ma Rainey\'s Black Bottom', 'Roma',
      'Tangerine', 'Past Lives', 'Train to Busan', 'Hit Man',
      'The Irishman', 'Marriage Story', 'American Graffiti',
      'They Cloned Tyrone', 'Groundhog Day', 'Hustle',
      'Dazed and Confused', 'Private Life', 'The Power of the Dog',
      'The Lost Daughter', 'Emily the Criminal', 'Captain Phillips'
    ];

    console.log(\`Searching for \${rtMovies.length} movies from RT Netflix guide...\`);
    
    const foundMovies = [];
    
    // Search for each movie in our database
    for (const title of rtMovies) {
      try {
        const query = \`
          SELECT 
            tmdb_id,
            title,
            year,
            streaming_data,
            poster_url
          FROM movies 
          WHERE 
            LOWER(title) LIKE LOWER($1)
            AND streaming_data IS NOT NULL 
            AND streaming_data != ''
            AND LENGTH(streaming_data) - LENGTH(REPLACE(streaming_data, ',', '')) + 1 BETWEEN 2 AND 4  -- 2-4 platforms
            AND tmdb_id::text NOT IN (\${currentIds.map(id => \`'\${id}'\`).join(',')})  -- Not already in list
            AND year BETWEEN 1970 AND 2024  -- Modern films
            AND poster_url IS NOT NULL
          ORDER BY year DESC
          LIMIT 3
        \`;
        
        const result = await pool.query(query, [\`%\${title}%\`]);
        
        if (result.rows.length > 0) {
          const movie = result.rows[0]; // Take best match
          const platformCount = movie.streaming_data.split(',').length;
          
          foundMovies.push({
            originalSearch: title,
            tmdbId: movie.tmdb_id,
            title: movie.title,
            year: movie.year,
            streaming_data: movie.streaming_data,
            platformCount: platformCount,
            poster: movie.poster_url,
            category: 'middle-ground'
          });
          
          console.log(\`✅ Found: \${movie.title} (\${movie.year}) - \${platformCount} platforms\`);
        } else {
          console.log(\`❌ Not found: \${title}\`);
        }
        
      } catch (error) {
        console.log(\`⚠️  Error searching \${title}: \${error.message}\`);
      }
      
      // Small delay to avoid overwhelming database
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Sort by year (newer first) and platform count
    foundMovies.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return a.platformCount - b.platformCount; // Prefer fewer platforms
    });
    
    console.log(\`\n🎯 FOUND \${foundMovies.length} MIDDLE-GROUND MOVIES:\`);
    console.log('=' .repeat(60));
    
    foundMovies.forEach((movie, index) => {
      console.log(\`\${index + 1}. \${movie.title} (\${movie.year}) - \${movie.platformCount} platforms - ID: \${movie.tmdbId}\`);
      console.log(\`   Streaming: \${movie.streaming_data}\`);
    });
    
    // Save results
    const middleGroundData = {
      foundMovies: foundMovies,
      selectedIds: foundMovies.map(movie => movie.tmdbId),
      summary: {
        totalFound: foundMovies.length,
        averagePlatforms: Math.round(foundMovies.reduce((sum, movie) => sum + movie.platformCount, 0) / foundMovies.length),
        yearRange: {
          oldest: Math.min(...foundMovies.map(m => m.year)),
          newest: Math.max(...foundMovies.map(m => m.year))
        }
      }
    };
    
    fs.writeFileSync('middle-ground-movies.json', JSON.stringify(middleGroundData, null, 2));
    
    console.log(\`\n📊 SUMMARY:\`);
    console.log(\`• Found: \${foundMovies.length} middle-ground movies\`);
    console.log(\`• Average platforms: \${middleGroundData.summary.averagePlatforms}\`);
    console.log(\`• Year range: \${middleGroundData.summary.yearRange.oldest}-\${middleGroundData.summary.yearRange.newest}\`);
    console.log(\`• These movies fill the gap between popular blockbusters and obscure art films\`);
    
    console.log(\`\n💾 Saved to middle-ground-movies.json\`);
    console.log(\`\n🔧 Ready to add these to curated list for better balance!\`);
    
    await pool.end();
    
  } catch (error) {
    console.error('Error finding middle-ground movies:', error);
    await pool.end();
  }
}

findMiddleGroundMovies();