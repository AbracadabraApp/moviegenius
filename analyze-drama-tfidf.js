// TF-IDF Analysis for Drama Movie Titles
import fs from 'fs';

class DramaTFIDFAnalyzer {
  constructor() {
    this.dramaFile = './normalized-categories/drama-normalized.json';
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

  calculateTFIDF() {
    console.log('🎭 DRAMA TF-IDF ANALYSIS');
    console.log('═══════════════════════════════════════════');

    // Load Drama data
    const dramaData = JSON.parse(fs.readFileSync(this.dramaFile, 'utf8'));
    console.log(`📊 Analyzing ${dramaData.movieCount} Drama titles`);

    // Tokenize all titles
    const documents = dramaData.movieData.map(movie => ({
      title: movie.title,
      tokens: this.tokenizeTitle(movie.title),
      year: movie.year
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

    console.log('\n🔤 TOP 30 DISTINCTIVE TERMS (High TF-IDF)');
    console.log('Term'.padEnd(20) + 'TF-IDF'.padEnd(12) + 'Freq'.padEnd(8) + 'In % Docs');
    console.log('─'.repeat(50));
    
    sortedTerms.slice(0, 30).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.tfidf.toFixed(3).padEnd(12) + 
        item.termFreq.toString().padEnd(8) + 
        item.docPercentage + '%'
      );
    });

    console.log('\n🌍 COMMON THEMES (High Document Frequency)');
    const commonTerms = Array.from(tfidfScores.values())
      .filter(item => item.docFreq > 10)
      .sort((a, b) => b.docFreq - a.docFreq);
    
    console.log('Term'.padEnd(20) + 'Appears in'.padEnd(12) + '% of Docs'.padEnd(12) + 'TF-IDF');
    console.log('─'.repeat(55));
    
    commonTerms.slice(0, 25).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.docFreq.toString().padEnd(12) + 
        item.docPercentage.padEnd(12) + 
        item.tfidf.toFixed(3)
      );
    });

    console.log('\n🎯 RARE BUT SIGNIFICANT TERMS (Low freq, high TF-IDF)');
    const rareSignificant = Array.from(tfidfScores.values())
      .filter(item => item.docFreq <= 5 && item.tfidf > 20)
      .sort((a, b) => b.tfidf - a.tfidf);
    
    console.log('Term'.padEnd(20) + 'TF-IDF'.padEnd(12) + 'Appears in'.padEnd(12) + 'Movies');
    console.log('─'.repeat(50));
    
    rareSignificant.slice(0, 20).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.tfidf.toFixed(3).padEnd(12) + 
        item.docFreq.toString().padEnd(12) + 
        'movies'
      );
    });

    // Thematic clustering analysis
    console.log('\n🎨 THEMATIC CLUSTERS');
    const thematicTerms = {
      'Human Relationships': ['love', 'marriage', 'family', 'father', 'mother', 'son', 'daughter', 'wife', 'husband', 'brother', 'sister'],
      'Life Stages': ['young', 'old', 'child', 'baby', 'teenage', 'youth', 'age', 'generation', 'years', 'boy', 'girl'],
      'Emotions': ['heart', 'soul', 'mind', 'dreams', 'memories', 'pain', 'joy', 'tears', 'hope', 'fear'],
      'Places & Settings': ['home', 'house', 'city', 'town', 'village', 'country', 'world', 'place', 'room', 'street'],
      'Time & Change': ['time', 'day', 'night', 'year', 'moment', 'past', 'future', 'today', 'tomorrow', 'yesterday'],
      'Social Issues': ['society', 'justice', 'freedom', 'peace', 'war', 'money', 'poor', 'rich', 'class', 'power'],
      'Identity': ['man', 'woman', 'person', 'people', 'human', 'self', 'identity', 'who', 'what', 'why'],
      'Conflict': ['against', 'between', 'fight', 'struggle', 'battle', 'conflict', 'problem', 'crisis', 'trouble']
    };

    for (const [cluster, terms] of Object.entries(thematicTerms)) {
      const clusterTerms = terms
        .map(term => tfidfScores.get(term))
        .filter(item => item)
        .sort((a, b) => b.tfidf - a.tfidf);
      
      if (clusterTerms.length > 0) {
        console.log(`\n${cluster}:`);
        clusterTerms.slice(0, 8).forEach(item => {
          console.log(`  ${item.term}: ${item.tfidf.toFixed(2)} TF-IDF (${item.docPercentage}% of docs)`);
        });
      }
    }

    // Era analysis
    console.log('\n📅 TEMPORAL VOCABULARY EVOLUTION');
    const eraTerms = new Map();
    
    documents.forEach(doc => {
      const decade = Math.floor(doc.year / 10) * 10;
      if (!eraTerms.has(decade)) {
        eraTerms.set(decade, new Map());
      }
      
      doc.tokens.forEach(token => {
        const decadeMap = eraTerms.get(decade);
        decadeMap.set(token, (decadeMap.get(token) || 0) + 1);
      });
    });

    console.log('\nTop dramatic themes by decade:');
    for (const decade of [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]) {
      if (eraTerms.has(decade)) {
        const topTerms = Array.from(eraTerms.get(decade).entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([term, freq]) => `${term}(${freq})`)
          .join(', ');
        console.log(`${decade}s: ${topTerms}`);
      }
    }

    // Compare to pure Drama movies
    console.log('\n🎯 PURE DRAMA vs ALL DRAMA COMPARISON');
    console.log('═══════════════════════════════════════════');
    
    // Load pure drama analysis results
    try {
      const pureDramaResults = JSON.parse(fs.readFileSync('./drama-exclusivity-analysis.json', 'utf8'));
      console.log(`📊 All Drama movies: ${dramaData.movieCount}`);
      console.log(`🔒 Pure Drama movies: ${pureDramaResults.exclusiveMovies} (${pureDramaResults.exclusivePercentage.toFixed(1)}%)`);
      console.log(`🔀 Multi-genre Drama: ${pureDramaResults.multiGenreMovies} (${pureDramaResults.multiGenrePercentage.toFixed(1)}%)`);
    } catch (error) {
      console.log('⚠️  Pure drama comparison data not available');
    }

    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Total unique terms: ${tfidfScores.size}`);
    console.log(`🔤 Average terms per title: ${(termFreq.size / totalDocs).toFixed(1)}`);
    console.log(`🎬 Most common theme: ${commonTerms[0]?.term} (${commonTerms[0]?.docPercentage}% of movies)`);
    console.log(`⭐ Most distinctive: ${sortedTerms[0]?.term} (TF-IDF: ${sortedTerms[0]?.tfidf.toFixed(2)})`);
    
    // Compare complexity to Animation
    const animationComparison = {
      animation: { totalTerms: 1091, moviesCount: 728 },
      drama: { totalTerms: tfidfScores.size, moviesCount: totalDocs }
    };
    
    console.log(`\n📈 Vocabulary Complexity vs Animation:`);
    console.log(`   Animation: ${animationComparison.animation.totalTerms} terms / ${animationComparison.animation.moviesCount} movies = ${(animationComparison.animation.totalTerms / animationComparison.animation.moviesCount).toFixed(2)} terms per movie`);
    console.log(`   Drama: ${animationComparison.drama.totalTerms} terms / ${animationComparison.drama.moviesCount} movies = ${(animationComparison.drama.totalTerms / animationComparison.drama.moviesCount).toFixed(2)} terms per movie`);

    return {
      totalTerms: tfidfScores.size,
      topDistinctive: sortedTerms.slice(0, 10),
      commonThemes: commonTerms.slice(0, 10),
      rareSignificant: rareSignificant.slice(0, 10),
      vocabularyComplexity: animationComparison.drama.totalTerms / animationComparison.drama.moviesCount
    };
  }
}

async function main() {
  const analyzer = new DramaTFIDFAnalyzer();
  
  try {
    const results = analyzer.calculateTFIDF();
    
    // Save results
    fs.writeFileSync('./drama-tfidf-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Drama TF-IDF analysis saved to: drama-tfidf-analysis.json');
    
    console.log('\n✅ Drama TF-IDF analysis complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 TF-IDF analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}