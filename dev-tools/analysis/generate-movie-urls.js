const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  console.error('💡 Check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMovieUrls() {
  console.log('🔍 Connecting to database...');

  try {
    // First, get movies that DON'T have analysis (priority)
    console.log('🎯 Finding movies without analysis...');
    const { data: moviesWithoutAnalysis, error: analysisError } = await supabase
      .from('movies')
      .select(
        `
        id, title, year, tmdb_id,
        movie_analyses!left(id)
      `
      )
      .not('tmdb_id', 'is', null)
      .is('movie_analyses.id', null)
      .order('tmdb_id');

    if (analysisError) {
      throw analysisError;
    }

    console.log(`📊 Found ${moviesWithoutAnalysis.length} movies without analysis`);

    // Then get all movies as backup
    let allMovies = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .not('tmdb_id', 'is', null)
        .order('tmdb_id')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw error;
      }

      if (!movies || movies.length === 0) {
        break;
      }

      allMovies = allMovies.concat(movies);
      console.log(
        `📖 Loaded page ${page + 1}: ${movies.length} movies (total: ${allMovies.length})`
      );

      if (movies.length < pageSize) {
        break; // Last page
      }

      page++;
    }

    // Prioritize movies without analysis, then add others
    const prioritizedMovies = [
      ...moviesWithoutAnalysis,
      ...allMovies.filter(
        movie => !moviesWithoutAnalysis.some(noAnalysis => noAnalysis.tmdb_id === movie.tmdb_id)
      ),
    ];

    console.log(
      `📊 Total movies: ${prioritizedMovies.length} (${moviesWithoutAnalysis.length} without analysis)`
    );

    // Generate clean URL list using TMDB IDs
    const movieUrls = prioritizedMovies.map((movie, index) => ({
      number: index + 1,
      title: `${movie.title} (${movie.year})`,
      url: `https://moviegenius.ai/movie/${movie.tmdb_id}`,
      movieId: movie.id.toString(),
      tmdbId: movie.tmdb_id,
      hasAnalysis: index >= moviesWithoutAnalysis.length,
    }));

    // Write to new clean file
    const outputFile = 'clean-movie-urls.json';
    fs.writeFileSync(outputFile, JSON.stringify(movieUrls, null, 2));

    console.log(`✅ Generated ${movieUrls.length} clean URLs`);
    console.log(`📁 Saved to: ${outputFile}`);
    console.log(`🎬 Sample URLs:`);
    console.log(`   ${movieUrls[0].url} - ${movieUrls[0].title}`);
    console.log(`   ${movieUrls[1].url} - ${movieUrls[1].title}`);
    console.log(`   ${movieUrls[2].url} - ${movieUrls[2].title}`);

    // Show range of TMDB IDs
    const minTmdbId = Math.min(...prioritizedMovies.map(m => m.tmdb_id));
    const maxTmdbId = Math.max(...prioritizedMovies.map(m => m.tmdb_id));
    console.log(`📈 TMDB ID range: ${minTmdbId} to ${maxTmdbId}`);

    return outputFile;
  } catch (error) {
    console.error('❌ Database query failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateMovieUrls()
    .then(filename => {
      console.log(`\n🚀 Ready to crawl! Run:`);
      console.log(`   node bulk-visit-crawler.js 0 --urls=${filename}`);
    })
    .catch(error => {
      console.error('💥 Generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateMovieUrls };
