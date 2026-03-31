// Analyze pure Drama movies to identify potential sub-genre splits
import fs from 'fs';

class PureDramaAnalyzer {
  constructor() {
    this.results = JSON.parse(fs.readFileSync('./drama-exclusivity-analysis.json', 'utf8'));
  }

  async analyzePureDramaSubgenres() {
    console.log('🎭 PURE DRAMA SUB-GENRE ANALYSIS');
    console.log('═══════════════════════════════════════════');
    
    // Load full Drama data to get titles for pure Drama movies
    const dramaData = JSON.parse(fs.readFileSync('./normalized-categories/drama-normalized.json', 'utf8'));
    
    // Create map of all Drama movies
    const allDramaMovies = new Map();
    for (const movie of dramaData.movieData) {
      const key = movie.tmdbId || movie.id;
      allDramaMovies.set(key, movie);
    }

    // Load other genres to identify which Drama movies are pure
    const normalizedDir = './normalized-categories';
    const genreFiles = fs.readdirSync(normalizedDir)
      .filter(file => file.endsWith('-normalized.json') && !file.startsWith('drama-'))
      .map(file => file.replace('-normalized.json', ''));

    // Build set of movies that appear in other genres
    const moviesInOtherGenres = new Set();
    
    for (const genre of genreFiles) {
      try {
        const genreData = JSON.parse(fs.readFileSync(`${normalizedDir}/${genre}-normalized.json`, 'utf8'));
        for (const movie of genreData.movieData) {
          const key = movie.tmdbId || movie.id;
          if (allDramaMovies.has(key)) {
            moviesInOtherGenres.add(key);
          }
        }
      } catch (error) {
        console.log(`⚠️  Skipping ${genre}: ${error.message}`);
      }
    }

    // Extract pure Drama movies
    const pureDramaMovies = [];
    for (const [key, movie] of allDramaMovies.entries()) {
      if (!moviesInOtherGenres.has(key)) {
        pureDramaMovies.push(movie);
      }
    }

    console.log(`🎬 Pure Drama movies identified: ${pureDramaMovies.length}`);

    // Analyze title patterns for sub-genre classification
    this.analyzeSubGenrePatterns(pureDramaMovies);
    
    // Temporal analysis
    this.analyzeTemporalPatterns(pureDramaMovies);
    
    // Create potential sub-genre splits
    const subGenreSplits = this.createSubGenreSplits(pureDramaMovies);
    
    return {
      totalPureDrama: pureDramaMovies.length,
      subGenreSplits: subGenreSplits,
      costSavings: this.calculateCostSavings()
    };
  }

  analyzeSubGenrePatterns(movies) {
    console.log('\n🔍 TITLE PATTERN ANALYSIS');
    console.log('═══════════════════════════════════════════');

    // Common drama keywords and themes
    const patterns = {
      'Family Drama': ['family', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'parent', 'child'],
      'Relationship Drama': ['love', 'marriage', 'divorce', 'relationship', 'affair', 'couple', 'husband', 'wife'],
      'Coming-of-Age': ['young', 'teenager', 'adolescent', 'growing', 'youth', 'school', 'college'],
      'Social Issues': ['justice', 'society', 'social', 'community', 'poverty', 'inequality', 'racism'],
      'Psychological Drama': ['mind', 'mental', 'psychology', 'memory', 'dreams', 'identity', 'self'],
      'Period Drama': ['century', 'historical', 'period', 'era', 'ancient', 'medieval', 'victorian'],
      'Medical Drama': ['doctor', 'hospital', 'medical', 'patient', 'disease', 'treatment', 'health'],
      'Legal Drama': ['lawyer', 'court', 'trial', 'judge', 'legal', 'justice', 'law'],
      'Workplace Drama': ['office', 'job', 'work', 'business', 'career', 'boss', 'employee'],
      'Rural/Small Town': ['town', 'village', 'rural', 'farm', 'countryside', 'small'],
      'Urban Drama': ['city', 'urban', 'street', 'neighborhood', 'downtown', 'metropolitan'],
      'Redemption': ['redemption', 'forgiveness', 'second chance', 'salvation', 'recovery']
    };

    const patternMatches = new Map();
    const movieClassifications = new Map();

    // Initialize pattern counts
    for (const pattern of Object.keys(patterns)) {
      patternMatches.set(pattern, []);
    }

    // Classify movies
    for (const movie of movies) {
      const title = movie.title.toLowerCase();
      const matchedPatterns = [];

      for (const [patternName, keywords] of Object.entries(patterns)) {
        const hasKeyword = keywords.some(keyword => title.includes(keyword));
        if (hasKeyword) {
          patternMatches.get(patternName).push(movie);
          matchedPatterns.push(patternName);
        }
      }

      if (matchedPatterns.length === 0) {
        matchedPatterns.push('General Drama');
      }

      movieClassifications.set(movie, matchedPatterns);
    }

    // Display results
    console.log('Sub-Genre Pattern'.padEnd(25) + 'Movies'.padEnd(10) + 'Examples');
    console.log('─'.repeat(70));

    const sortedPatterns = Array.from(patternMatches.entries())
      .sort((a, b) => b[1].length - a[1].length);

    for (const [pattern, movieList] of sortedPatterns) {
      if (movieList.length > 0) {
        const examples = movieList.slice(0, 3)
          .map(m => `${m.title} (${m.year || '?'})`)
          .join(', ');
        
        console.log(
          pattern.padEnd(25) + 
          movieList.length.toString().padEnd(10) + 
          examples
        );
      }
    }

    const unclassified = movies.length - Array.from(patternMatches.values())
      .reduce((sum, list) => sum + list.length, 0);
    
    if (unclassified > 0) {
      console.log('General Drama'.padEnd(25) + unclassified.toString().padEnd(10) + 'Movies without specific patterns');
    }

    return patternMatches;
  }

  analyzeTemporalPatterns(movies) {
    console.log('\n📅 TEMPORAL ANALYSIS');
    console.log('═══════════════════════════════════════════');

    const decades = new Map();
    for (const movie of movies) {
      if (movie.year) {
        const decade = Math.floor(movie.year / 10) * 10;
        if (!decades.has(decade)) {
          decades.set(decade, []);
        }
        decades.get(decade).push(movie);
      }
    }

    console.log('Decade'.padEnd(10) + 'Movies'.padEnd(10) + 'Examples');
    console.log('─'.repeat(50));

    const sortedDecades = Array.from(decades.entries())
      .sort((a, b) => b[0] - a[0]);

    for (const [decade, movieList] of sortedDecades.slice(0, 10)) {
      const examples = movieList.slice(0, 2)
        .map(m => m.title)
        .join(', ');
      
      console.log(
        `${decade}s`.padEnd(10) + 
        movieList.length.toString().padEnd(10) + 
        examples
      );
    }

    return decades;
  }

  createSubGenreSplits(movies) {
    console.log('\n🎯 RECOMMENDED SUB-GENRE SPLITS');
    console.log('═══════════════════════════════════════════');

    // Strategy 1: Size-based splits (target ~500-800 movies per sub-genre)
    const targetSize = 600;
    const numSplits = Math.ceil(movies.length / targetSize);
    
    console.log(`📊 Pure Drama: ${movies.length} movies`);
    console.log(`🎯 Target: ${numSplits} sub-genres of ~${targetSize} movies each`);
    
    const splits = [
      {
        name: 'Contemporary Drama',
        description: 'Modern dramas (2000+)',
        estimatedSize: movies.filter(m => m.year >= 2000).length,
        filter: 'year >= 2000'
      },
      {
        name: 'Classic Drama', 
        description: 'Older dramas (1990-1999)',
        estimatedSize: movies.filter(m => m.year >= 1990 && m.year < 2000).length,
        filter: '1990 <= year < 2000'
      },
      {
        name: 'Vintage Drama',
        description: 'Historical dramas (pre-1990)',
        estimatedSize: movies.filter(m => m.year < 1990).length,
        filter: 'year < 1990'
      },
      {
        name: 'Independent Drama',
        description: 'Lower budget/art house dramas',
        estimatedSize: Math.floor(movies.length * 0.3), // Estimate
        filter: 'Title patterns + metadata'
      }
    ];

    console.log('\nProposed Sub-Genres:');
    console.log('Name'.padEnd(25) + 'Est. Size'.padEnd(12) + 'Cost Est.'.padEnd(12) + 'Description');
    console.log('─'.repeat(80));

    let totalEstimated = 0;
    for (const split of splits) {
      const costEst = (split.estimatedSize * 0.0061).toFixed(2);
      totalEstimated += split.estimatedSize;
      
      console.log(
        split.name.padEnd(25) + 
        split.estimatedSize.toString().padEnd(12) + 
        `$${costEst}`.padEnd(12) + 
        split.description
      );
    }

    console.log('─'.repeat(80));
    console.log(`Total Estimated: ${totalEstimated} movies, $${(totalEstimated * 0.0061).toFixed(2)}`);

    return splits;
  }

  calculateCostSavings() {
    const originalCost = 8866 * 0.0061; // All Drama movies
    const pureDramaCost = 3276 * 0.0061; // Pure Drama only
    const savings = originalCost - pureDramaCost;
    const savingsPercent = (savings / originalCost * 100);

    console.log('\n💰 COST ANALYSIS');
    console.log('═══════════════════════════════════════════');
    console.log(`🎭 All Drama processing: $${originalCost.toFixed(2)} (8,866 movies)`);
    console.log(`🎯 Pure Drama only: $${pureDramaCost.toFixed(2)} (3,276 movies)`);
    console.log(`💵 Savings: $${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%)`);

    return {
      originalCost,
      pureDramaCost,
      savings,
      savingsPercent
    };
  }
}

async function main() {
  const analyzer = new PureDramaAnalyzer();
  
  try {
    const results = await analyzer.analyzePureDramaSubgenres();
    
    // Save results
    fs.writeFileSync('./pure-drama-subgenre-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Analysis saved to: pure-drama-subgenre-analysis.json');
    
    console.log('\n✅ Pure Drama sub-genre analysis complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}