// TF-IDF Analysis for Animation Movie Titles
import fs from 'fs';

class AnimationTFIDFAnalyzer {
  constructor() {
    this.animationFile = './normalized-categories/animation-normalized.json';
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'movie', 'film', 'story', 'tale',
      'adventure', 'part', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'
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
    console.log('🎬 ANIMATION TF-IDF ANALYSIS');
    console.log('═══════════════════════════════════════════');

    // Load Animation data
    const animationData = JSON.parse(fs.readFileSync(this.animationFile, 'utf8'));
    console.log(`📊 Analyzing ${animationData.movieCount} Animation titles`);

    // Tokenize all titles
    const documents = animationData.movieData.map(movie => ({
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
      .filter(item => item.docFreq > 5)
      .sort((a, b) => b.docFreq - a.docFreq);
    
    console.log('Term'.padEnd(20) + 'Appears in'.padEnd(12) + '% of Docs'.padEnd(12) + 'TF-IDF');
    console.log('─'.repeat(55));
    
    commonTerms.slice(0, 20).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.docFreq.toString().padEnd(12) + 
        item.docPercentage.padEnd(12) + 
        item.tfidf.toFixed(3)
      );
    });

    console.log('\n🎯 RARE BUT SIGNIFICANT TERMS (Low freq, high TF-IDF)');
    const rareSignificant = Array.from(tfidfScores.values())
      .filter(item => item.docFreq <= 3 && item.tfidf > 10)
      .sort((a, b) => b.tfidf - a.tfidf);
    
    console.log('Term'.padEnd(20) + 'TF-IDF'.padEnd(12) + 'Appears in'.padEnd(12) + 'Movies');
    console.log('─'.repeat(50));
    
    rareSignificant.slice(0, 15).forEach(item => {
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
      'Character Types': ['princess', 'prince', 'king', 'queen', 'dragon', 'monster', 'robot', 'alien'],
      'Settings': ['island', 'castle', 'forest', 'ocean', 'space', 'world', 'planet', 'city'],
      'Animals': ['cat', 'dog', 'bear', 'mouse', 'bird', 'fish', 'lion', 'elephant'],
      'Emotions/Themes': ['love', 'magic', 'dream', 'lost', 'secret', 'mystery', 'wonder'],
      'Age Groups': ['little', 'baby', 'giant', 'big', 'small', 'young', 'old'],
      'Action': ['rescue', 'escape', 'quest', 'journey', 'battle', 'fight', 'run']
    };

    for (const [cluster, terms] of Object.entries(thematicTerms)) {
      const clusterTerms = terms
        .map(term => tfidfScores.get(term))
        .filter(item => item)
        .sort((a, b) => b.tfidf - a.tfidf);
      
      if (clusterTerms.length > 0) {
        console.log(`\n${cluster}:`);
        clusterTerms.forEach(item => {
          console.log(`  ${item.term}: ${item.tfidf.toFixed(2)} TF-IDF (${item.docPercentage}% of docs)`);
        });
      }
    }

    // Era analysis
    console.log('\n📅 TEMPORAL PATTERNS');
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

    console.log('\nTop terms by decade:');
    for (const decade of [1990, 2000, 2010, 2020]) {
      if (eraTerms.has(decade)) {
        const topTerms = Array.from(eraTerms.get(decade).entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([term, freq]) => `${term}(${freq})`)
          .join(', ');
        console.log(`${decade}s: ${topTerms}`);
      }
    }

    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Total unique terms: ${tfidfScores.size}`);
    console.log(`🔤 Average terms per title: ${(termFreq.size / totalDocs).toFixed(1)}`);
    console.log(`🎬 Most common theme: ${commonTerms[0]?.term} (${commonTerms[0]?.docPercentage}% of movies)`);
    console.log(`⭐ Most distinctive: ${sortedTerms[0]?.term} (TF-IDF: ${sortedTerms[0]?.tfidf.toFixed(2)})`);

    return {
      totalTerms: tfidfScores.size,
      topDistinctive: sortedTerms.slice(0, 10),
      commonThemes: commonTerms.slice(0, 10),
      rareSignificant: rareSignificant.slice(0, 10)
    };
  }
}

async function main() {
  const analyzer = new AnimationTFIDFAnalyzer();
  
  try {
    const results = analyzer.calculateTFIDF();
    console.log('\n✅ Animation TF-IDF analysis complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 TF-IDF analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}