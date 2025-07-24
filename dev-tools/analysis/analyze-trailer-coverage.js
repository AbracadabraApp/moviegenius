const fs = require('fs');

// Read the movie data
const moviesData = JSON.parse(fs.readFileSync('./data/discovered-movies.json', 'utf8'));

// Analysis functions
function analyzeMoviesByEra(movies) {
  const eras = {
    'pre-1980': { count: 0, movies: [] },
    '1980-1999': { count: 0, movies: [] },
    '2000-2009': { count: 0, movies: [] },
    '2010-2019': { count: 0, movies: [] },
    '2020+': { count: 0, movies: [] },
  };

  movies.forEach(movie => {
    const year = movie.year;
    if (year < 1980) {
      eras['pre-1980'].count++;
      eras['pre-1980'].movies.push(movie);
    } else if (year >= 1980 && year <= 1999) {
      eras['1980-1999'].count++;
      eras['1980-1999'].movies.push(movie);
    } else if (year >= 2000 && year <= 2009) {
      eras['2000-2009'].count++;
      eras['2000-2009'].movies.push(movie);
    } else if (year >= 2010 && year <= 2019) {
      eras['2010-2019'].count++;
      eras['2010-2019'].movies.push(movie);
    } else if (year >= 2020) {
      eras['2020+'].count++;
      eras['2020+'].movies.push(movie);
    }
  });

  return eras;
}

function categorizeMoviesByType(movies) {
  const categories = {
    'major-studio': { count: 0, examples: [] },
    independent: { count: 0, examples: [] },
    international: { count: 0, examples: [] },
    documentary: { count: 0, examples: [] },
    arthouse: { count: 0, examples: [] },
  };

  // Simple heuristics based on movie titles, streaming platforms, and tmdb_ids
  movies.forEach(movie => {
    const title = movie.title.toLowerCase();
    const streaming = movie.streaming_data ? movie.streaming_data.toLowerCase() : '';

    // International films indicators
    if (
      title.includes('[') ||
      title.includes('foreign') ||
      streaming.includes('criterion') ||
      title.match(/[^\w\s]/)
    ) {
      categories['international'].count++;
      categories['international'].examples.push(`${movie.title} (${movie.year})`);
    }
    // Documentary indicators
    else if (
      title.includes('documentary') ||
      title.includes('story of') ||
      streaming.includes('documentary')
    ) {
      categories['documentary'].count++;
      categories['documentary'].examples.push(`${movie.title} (${movie.year})`);
    }
    // Art house indicators
    else if (streaming.includes('criterion') || streaming.includes('mubi') || title.length > 30) {
      categories['arthouse'].count++;
      categories['arthouse'].examples.push(`${movie.title} (${movie.year})`);
    }
    // Major studio indicators (high tmdb_id usually means popular/major)
    else if (
      movie.tmdb_id > 10000 &&
      movie.year >= 2000 &&
      (streaming.includes('netflix') ||
        streaming.includes('hulu') ||
        streaming.includes('prime') ||
        streaming.includes('disney'))
    ) {
      categories['major-studio'].count++;
      categories['major-studio'].examples.push(`${movie.title} (${movie.year})`);
    }
    // Independent films
    else {
      categories['independent'].count++;
      categories['independent'].examples.push(`${movie.title} (${movie.year})`);
    }
  });

  return categories;
}

function estimateTrailerCoverage(eras, categories) {
  // Trailer availability estimates based on industry knowledge
  const trailerEstimates = {
    'pre-1980': 0.15, // Very few digital trailers available
    '1980-1999': 0.35, // Some major films have trailers digitized
    '2000-2009': 0.75, // Most major films, some independents
    '2010-2019': 0.9, // Nearly all films have trailers
    '2020+': 0.95, // Almost universal trailer availability
  };

  const typeMultipliers = {
    'major-studio': 1.2,
    independent: 0.7,
    international: 0.6,
    documentary: 0.8,
    arthouse: 0.5,
  };

  let totalEstimatedTrailers = 0;
  let totalMovies = 0;

  Object.keys(eras).forEach(era => {
    const eraMovies = eras[era].count;
    const baseRate = trailerEstimates[era];
    totalMovies += eraMovies;
    totalEstimatedTrailers += eraMovies * baseRate;
  });

  return {
    overallCoverage: (totalEstimatedTrailers / totalMovies) * 100,
    eraBreakdown: Object.keys(eras).map(era => ({
      era,
      count: eras[era].count,
      estimatedCoverage: trailerEstimates[era] * 100,
    })),
    totalMovies,
    estimatedTrailersAvailable: Math.round(totalEstimatedTrailers),
  };
}

// Perform analysis
console.log('Analyzing movie database for trailer coverage...\n');

const totalMovies = moviesData.length;
console.log(`Total movies in database: ${totalMovies}\n`);

// Sample some movies for manual inspection
console.log('Sample movies from database:');
const sampleMovies = moviesData.slice(0, 20);
sampleMovies.forEach(movie => {
  console.log(`- ${movie.title} (${movie.year}) - TMDB ID: ${movie.tmdb_id}`);
});
console.log('\n');

// Analyze by era
const eraAnalysis = analyzeMoviesByEra(moviesData);
console.log('Movies by Era:');
Object.keys(eraAnalysis).forEach(era => {
  console.log(`${era}: ${eraAnalysis[era].count} movies`);
});
console.log('\n');

// Analyze by type
const typeAnalysis = categorizeMoviesByType(moviesData);
console.log('Movies by Type (estimated):');
Object.keys(typeAnalysis).forEach(type => {
  console.log(`${type}: ${typeAnalysis[type].count} movies`);
  if (typeAnalysis[type].examples.length > 0) {
    console.log(`  Examples: ${typeAnalysis[type].examples.slice(0, 3).join(', ')}`);
  }
});
console.log('\n');

// Estimate trailer coverage
const coverageEstimate = estimateTrailerCoverage(eraAnalysis, typeAnalysis);
console.log('Trailer Coverage Estimates:');
console.log(`Overall estimated coverage: ${coverageEstimate.overallCoverage.toFixed(1)}%`);
console.log(`Total movies: ${coverageEstimate.totalMovies}`);
console.log(`Estimated trailers available: ${coverageEstimate.estimatedTrailersAvailable}\n`);

console.log('Coverage by Era:');
coverageEstimate.eraBreakdown.forEach(era => {
  console.log(`${era.era}: ${era.count} movies, ~${era.estimatedCoverage}% coverage`);
});

// Additional insights
console.log('\nKey Insights:');
console.log('- Modern films (2010+) have highest trailer availability');
console.log('- Major studio films more likely to have trailers than independents');
console.log('- International and art house films may have limited English trailers');
console.log('- Pre-1980 films unlikely to have digital trailers available');
console.log('- Streaming availability suggests mix of mainstream and niche content');
