// TF-IDF Analysis for Pure Drama Movies Only (3,276 movies)
import fs from 'fs';

class PureDramaTFIDFAnalyzer {
  constructor() {
    this.dramaFile = './normalized-categories/drama-normalized.json';
    this.normalizedDir = './normalized-categories';
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'movie', 'film', 'story', 'tale',
      'drama', 'part', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii',
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'
    ]);
  }

  tokenizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word))
      .filter(word => !word.match(/^\d+$/)); // Remove pure numbers
  }

  async extractPureDramaMovies() {
    console.log('🔍 Extracting Pure Drama movies...');
    
    // Load all Drama movies
    const dramaData = JSON.parse(fs.readFileSync(this.dramaFile, 'utf8'));
    const allDramaMovies = new Map();
    
    for (const movie of dramaData.movieData) {
      const key = movie.tmdbId || movie.id;
      if (key) {
        allDramaMovies.set(key, movie);
      }
    }

    // Load other genres to identify cross-genre movies
    const genreFiles = fs.readdirSync(this.normalizedDir)
      .filter(file => file.endsWith('-normalized.json') && !file.startsWith('drama-'));

    const moviesInOtherGenres = new Set();
    
    for (const genreFile of genreFiles) {
      try {
        const genreData = JSON.parse(fs.readFileSync(`${this.normalizedDir}/${genreFile}`, 'utf8'));
        for (const movie of genreData.movieData) {
          const key = movie.tmdbId || movie.id;
          if (key && allDramaMovies.has(key)) {
            moviesInOtherGenres.add(key);
          }
        }
      } catch (error) {
        console.log(`⚠️  Skipping ${genreFile}: ${error.message}`);
      }
    }

    // Extract pure Drama movies
    const pureDramaMovies = [];
    for (const [key, movie] of allDramaMovies.entries()) {
      if (!moviesInOtherGenres.has(key)) {
        pureDramaMovies.push(movie);
      }
    }

    console.log(`✅ Found ${pureDramaMovies.length} pure Drama movies`);
    return pureDramaMovies;
  }

  calculateTFIDF(movies) {
    console.log('\n🎭 PURE DRAMA TF-IDF ANALYSIS');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Analyzing ${movies.length} Pure Drama titles`);

    // Tokenize all titles
    const documents = movies.map(movie => ({
      title: movie.title,
      tokens: this.tokenizeTitle(movie.title),
      year: movie.year,
      tmdbId: movie.tmdbId,
      id: movie.id
    }));

    // Calculate document frequency for each term
    const documentFreq = new Map();
    const termFreq = new Map();
    
    documents.forEach(doc => {
      const uniqueTerms = new Set(doc.tokens);
      uniqueTerms.forEach(term => {
        documentFreq.set(term, (documentFreq.get(term) || 0) + 1);
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      });
    });

    const totalDocs = documents.length;

    // Calculate TF-IDF scores for each term
    const tfidfScores = new Map();
    
    for (const [term, df] of documentFreq.entries()) {
      const idf = Math.log(totalDocs / df);
      const tf = termFreq.get(term);
      const tfidf = tf * idf;
      
      tfidfScores.set(term, {
        term,
        termFreq: tf,
        docFreq: df,
        idf: idf,
        tfidf: tfidf,
        docPercentage: (df / totalDocs * 100).toFixed(1)
      });
    }

    // Sort by TF-IDF score
    const sortedTerms = Array.from(tfidfScores.values())
      .sort((a, b) => b.tfidf - a.tfidf);

    console.log('\n🔤 TOP 25 DISTINCTIVE TERMS IN PURE DRAMA');
    console.log('Term'.padEnd(20) + 'TF-IDF'.padEnd(12) + 'Freq'.padEnd(8) + 'In % Movies');
    console.log('─'.repeat(55));
    
    sortedTerms.slice(0, 25).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.tfidf.toFixed(2).padEnd(12) + 
        item.termFreq.toString().padEnd(8) + 
        item.docPercentage + '%'
      );
    });

    console.log('\n🌍 COMMON PURE DRAMA THEMES (Appear in 10+ movies)');
    const commonTerms = Array.from(tfidfScores.values())
      .filter(item => item.docFreq >= 10)
      .sort((a, b) => b.docFreq - a.docFreq);
    
    console.log('Term'.padEnd(20) + 'Movies'.padEnd(10) + '% of Pure'.padEnd(12) + 'TF-IDF');
    console.log('─'.repeat(55));
    
    commonTerms.slice(0, 20).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.docFreq.toString().padEnd(10) + 
        item.docPercentage.padEnd(12) + 
        item.tfidf.toFixed(2)
      );
    });

    // Thematic clustering for meaningful sub-genres
    console.log('\n🎨 THEMATIC CLUSTERS FOR SUB-GENRE IDENTIFICATION');
    const thematicTerms = {
      'Family & Relationships': ['family', 'father', 'mother', 'son', 'daughter', 'wife', 'husband', 'brother', 'sister', 'marriage', 'love', 'home'],
      'Character Studies': ['man', 'woman', 'girl', 'boy', 'person', 'people', 'who', 'what', 'self', 'identity', 'mind', 'soul'],
      'Life & Time': ['life', 'time', 'day', 'night', 'year', 'young', 'old', 'past', 'future', 'years', 'age', 'death'],
      'Places & Settings': ['city', 'town', 'house', 'street', 'world', 'country', 'place', 'room', 'village', 'urban', 'rural'],
      'Social & Political': ['society', 'social', 'justice', 'freedom', 'war', 'peace', 'power', 'class', 'american', 'country'],
      'Emotions & Psychology': ['heart', 'soul', 'dreams', 'memories', 'hope', 'fear', 'pain', 'joy', 'tears', 'mind', 'feelings'],
      'Colors & Atmosphere': ['white', 'black', 'red', 'blue', 'dark', 'light', 'shadow', 'bright', 'color'],
      'Conflict & Action': ['fight', 'battle', 'struggle', 'against', 'between', 'war', 'conflict', 'trouble', 'problem']
    };

    const clusterStrengths = new Map();
    
    for (const [cluster, terms] of Object.entries(thematicTerms)) {
      const clusterTerms = terms
        .map(term => tfidfScores.get(term))
        .filter(item => item);
      
      if (clusterTerms.length > 0) {
        const totalStrength = clusterTerms.reduce((sum, item) => sum + item.tfidf, 0);
        const avgStrength = totalStrength / clusterTerms.length;
        const coverage = clusterTerms.reduce((sum, item) => sum + item.docFreq, 0);
        
        clusterStrengths.set(cluster, {
          avgStrength,
          totalStrength,
          coverage,
          termCount: clusterTerms.length,
          terms: clusterTerms.sort((a, b) => b.tfidf - a.tfidf)
        });

        console.log(`\n${cluster} (${coverage} movie appearances):`);
        clusterTerms.slice(0, 6).forEach(item => {
          if (item) {
            console.log(`  ${item.term}: ${item.tfidf.toFixed(1)} TF-IDF (${item.docPercentage}% of movies)`);
          }
        });
      }
    }

    // Propose meaningful sub-genre splits based on strongest clusters
    console.log('\n🎯 PROPOSED MEANINGFUL SUB-GENRES');
    console.log('═══════════════════════════════════════════');
    
    const sortedClusters = Array.from(clusterStrengths.entries())
      .sort((a, b) => b[1].totalStrength - a[1].totalStrength);

    const subGenreProposals = this.createMeaningfulSubGenres(sortedClusters, movies.length, tfidfScores);
    
    return {
      totalPureDrama: movies.length,
      totalTerms: tfidfScores.size,
      topDistinctive: sortedTerms.slice(0, 15),
      commonThemes: commonTerms.slice(0, 15),
      thematicClusters: clusterStrengths,
      subGenreProposals: subGenreProposals,
      vocabularyComplexity: tfidfScores.size / movies.length
    };
  }

  createMeaningfulSubGenres(sortedClusters, totalMovies, tfidfScores) {
    console.log('\nBased on TF-IDF analysis, proposed sub-genres:');
    console.log('─'.repeat(60));

    const proposals = [];
    
    // Strategy: Use strongest thematic clusters to create meaningful categories
    const strongestClusters = sortedClusters.slice(0, 4);
    
    for (const [clusterName, data] of strongestClusters) {
      const estimatedSize = Math.min(Math.max(data.coverage * 3, 400), 1000); // Rough estimate
      const costEst = (estimatedSize * 0.0061).toFixed(2);
      
      console.log(`${clusterName}:`);
      console.log(`  Estimated size: ~${estimatedSize} movies`);
      console.log(`  Cost estimate: $${costEst}`);
      console.log(`  Key themes: ${data.terms.slice(0, 4).map(t => t.term).join(', ')}`);
      console.log('');
      
      proposals.push({
        name: clusterName,
        estimatedSize: estimatedSize,
        costEstimate: parseFloat(costEst),
        keyThemes: data.terms.slice(0, 6).map(t => t.term),
        thematicStrength: data.totalStrength
      });
    }

    // Add a catch-all for remaining movies
    const accountedFor = proposals.reduce((sum, p) => sum + p.estimatedSize, 0);
    const remaining = Math.max(totalMovies - accountedFor, 200);
    
    proposals.push({
      name: 'Personal Drama',
      estimatedSize: remaining,
      costEstimate: (remaining * 0.0061),
      keyThemes: ['individual stories', 'character-driven'],
      thematicStrength: 0
    });

    const totalCost = proposals.reduce((sum, p) => sum + p.costEstimate, 0);
    
    console.log('SUMMARY:');
    console.log(`Total movies: ${totalMovies}`);
    console.log(`Total estimated cost: $${totalCost.toFixed(2)}`);
    console.log(`Original full Drama cost: $${(8866 * 0.0061).toFixed(2)}`);
    console.log(`Savings: $${(8866 * 0.0061 - totalCost).toFixed(2)} (${((8866 * 0.0061 - totalCost)/(8866 * 0.0061) * 100).toFixed(1)}%)`);

    return proposals;
  }
}

async function main() {
  const analyzer = new PureDramaTFIDFAnalyzer();
  
  try {
    const pureDramaMovies = await analyzer.extractPureDramaMovies();
    const results = await analyzer.calculateTFIDF(pureDramaMovies);
    
    // Save results
    fs.writeFileSync('./pure-drama-tfidf-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Pure Drama TF-IDF analysis saved to: pure-drama-tfidf-analysis.json');
    
    console.log('\n✅ Pure Drama TF-IDF analysis complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}