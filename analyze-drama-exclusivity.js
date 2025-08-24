// Analyze Drama genre exclusivity - how many movies appear ONLY in Drama
import fs from 'fs';
import path from 'path';

class DramaExclusivityAnalyzer {
  constructor() {
    this.normalizedDir = './normalized-categories';
  }

  async analyzeDramaExclusivity() {
    console.log('🎭 DRAMA EXCLUSIVITY ANALYSIS');
    console.log('═══════════════════════════════════════════');
    
    // Load all normalized genre files
    const genreFiles = fs.readdirSync(this.normalizedDir)
      .filter(file => file.endsWith('-normalized.json'))
      .map(file => file.replace('-normalized.json', ''));

    console.log(`📊 Found ${genreFiles.length} genres to analyze`);
    
    // Build movie-to-genres mapping
    const movieToGenres = new Map();
    const genreMovieCounts = new Map();
    
    for (const genre of genreFiles) {
      const filePath = path.join(this.normalizedDir, `${genre}-normalized.json`);
      
      try {
        const genreData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        genreMovieCounts.set(genre, genreData.movieCount);
        
        for (const movie of genreData.movieData) {
          const movieKey = movie.tmdbId || movie.id; // Use TMDB ID or UUID
          if (!movieKey) continue;
          
          if (!movieToGenres.has(movieKey)) {
            movieToGenres.set(movieKey, {
              title: movie.title,
              year: movie.year,
              genres: []
            });
          }
          
          movieToGenres.get(movieKey).genres.push(genre);
        }
      } catch (error) {
        console.log(`⚠️  Skipping ${genre}: ${error.message}`);
      }
    }

    console.log(`🎬 Total unique movies across all genres: ${movieToGenres.size}`);
    
    // Load Drama genre specifically
    const dramaFile = path.join(this.normalizedDir, 'drama-normalized.json');
    if (!fs.existsSync(dramaFile)) {
      throw new Error('Drama genre file not found');
    }
    
    const dramaData = JSON.parse(fs.readFileSync(dramaFile, 'utf8'));
    console.log(`🎭 Drama movies: ${dramaData.movieCount}`);
    
    // Find Drama-exclusive movies
    const dramaExclusive = [];
    const dramaWithOtherGenres = [];
    const genreOverlapCounts = new Map();
    
    for (const movie of dramaData.movieData) {
      const movieKey = movie.tmdbId || movie.id;
      if (!movieKey) continue;
      
      const movieInfo = movieToGenres.get(movieKey);
      if (!movieInfo) continue;
      
      if (movieInfo.genres.length === 1 && movieInfo.genres[0] === 'drama') {
        dramaExclusive.push({
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdbId,
          id: movie.id
        });
      } else {
        // Count other genres this Drama movie appears in
        const otherGenres = movieInfo.genres.filter(g => g !== 'drama');
        dramaWithOtherGenres.push({
          title: movie.title,
          year: movie.year,
          otherGenres: otherGenres
        });
        
        // Count overlaps
        for (const otherGenre of otherGenres) {
          genreOverlapCounts.set(otherGenre, (genreOverlapCounts.get(otherGenre) || 0) + 1);
        }
      }
    }

    // Results
    console.log('\n📊 DRAMA EXCLUSIVITY RESULTS');
    console.log('═══════════════════════════════════════════');
    console.log(`🎭 Total Drama movies: ${dramaData.movieCount}`);
    console.log(`🔒 Drama-exclusive movies: ${dramaExclusive.length} (${(dramaExclusive.length / dramaData.movieCount * 100).toFixed(1)}%)`);
    console.log(`🔀 Drama movies with other genres: ${dramaWithOtherGenres.length} (${(dramaWithOtherGenres.length / dramaData.movieCount * 100).toFixed(1)}%)`);

    console.log('\n🎯 TOP DRAMA-EXCLUSIVE MOVIES');
    console.log('Title'.padEnd(50) + 'Year'.padEnd(8) + 'TMDB ID');
    console.log('─'.repeat(70));
    
    dramaExclusive.slice(0, 20).forEach(movie => {
      console.log(
        movie.title.slice(0, 49).padEnd(50) + 
        (movie.year || '?').toString().padEnd(8) +
        (movie.tmdbId || 'No TMDB')
      );
    });

    console.log('\n🤝 DRAMA GENRE OVERLAPS (Top 15)');
    console.log('Genre'.padEnd(20) + 'Shared Movies'.padEnd(15) + '% of Drama');
    console.log('─'.repeat(45));
    
    const sortedOverlaps = Array.from(genreOverlapCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    sortedOverlaps.forEach(([genre, count]) => {
      const percentage = (count / dramaData.movieCount * 100).toFixed(1);
      console.log(
        genre.padEnd(20) + 
        count.toString().padEnd(15) + 
        percentage + '%'
      );
    });

    // Genre size comparison for context
    console.log('\n📊 GENRE SIZE CONTEXT');
    console.log('Genre'.padEnd(20) + 'Movies'.padEnd(10) + 'Drama Overlap');
    console.log('─'.repeat(40));
    
    sortedOverlaps.slice(0, 10).forEach(([genre, overlapCount]) => {
      const genreSize = genreMovieCounts.get(genre) || 0;
      const overlapPercent = genreSize > 0 ? (overlapCount / genreSize * 100).toFixed(1) : '0.0';
      console.log(
        genre.padEnd(20) + 
        genreSize.toString().padEnd(10) + 
        `${overlapCount}/${genreSize} (${overlapPercent}%)`
      );
    });

    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Drama is the largest genre: ${dramaData.movieCount} movies`);
    console.log(`🔒 Pure Drama movies: ${dramaExclusive.length} (${(dramaExclusive.length / dramaData.movieCount * 100).toFixed(1)}%)`);
    console.log(`🔀 Multi-genre Drama: ${dramaWithOtherGenres.length} (${(dramaWithOtherGenres.length / dramaData.movieCount * 100).toFixed(1)}%)`);
    
    if (sortedOverlaps.length > 0) {
      console.log(`🏆 Most overlapping genre: ${sortedOverlaps[0][0]} (${sortedOverlaps[0][1]} movies, ${(sortedOverlaps[0][1] / dramaData.movieCount * 100).toFixed(1)}%)`);
    }

    // Save detailed results
    const results = {
      totalDramaMovies: dramaData.movieCount,
      exclusiveMovies: dramaExclusive.length,
      exclusivePercentage: (dramaExclusive.length / dramaData.movieCount * 100),
      multiGenreMovies: dramaWithOtherGenres.length,
      multiGenrePercentage: (dramaWithOtherGenres.length / dramaData.movieCount * 100),
      topOverlaps: sortedOverlaps,
      exclusiveMoviesSample: dramaExclusive.slice(0, 50)
    };

    fs.writeFileSync('./drama-exclusivity-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Detailed results saved to: drama-exclusivity-analysis.json');

    return results;
  }
}

async function main() {
  const analyzer = new DramaExclusivityAnalyzer();
  
  try {
    await analyzer.analyzeDramaExclusivity();
    console.log('\n✅ Drama exclusivity analysis complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Drama analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}