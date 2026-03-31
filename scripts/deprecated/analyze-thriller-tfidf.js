// TF-IDF Analysis for Thriller Movie Titles - Find meaningful sub-genre splits
import fs from 'fs';

class ThrillerTFIDFAnalyzer {
  constructor() {
    this.thrillerFile = './normalized-categories/thriller-normalized.json';
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'movie', 'film', 'story', 'tale',
      'thriller', 'part', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii',
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
    console.log('🎯 THRILLER TF-IDF ANALYSIS');
    console.log('═══════════════════════════════════════════');

    // Load Thriller data
    const thrillerData = JSON.parse(fs.readFileSync(this.thrillerFile, 'utf8'));
    console.log(`📊 Analyzing ${thrillerData.movieCount} Thriller titles`);

    // Tokenize all titles
    const documents = thrillerData.movieData.map(movie => ({
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

    console.log('\n🔤 TOP 25 DISTINCTIVE THRILLER TERMS');
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

    console.log('\n🌍 COMMON THRILLER THEMES (Appear in 10+ movies)');
    const commonTerms = Array.from(tfidfScores.values())
      .filter(item => item.docFreq >= 10)
      .sort((a, b) => b.docFreq - a.docFreq);
    
    console.log('Term'.padEnd(20) + 'Movies'.padEnd(10) + '% of Genre'.padEnd(12) + 'TF-IDF');
    console.log('─'.repeat(55));
    
    commonTerms.slice(0, 25).forEach(item => {
      console.log(
        item.term.padEnd(20) + 
        item.docFreq.toString().padEnd(10) + 
        item.docPercentage.padEnd(12) + 
        item.tfidf.toFixed(2)
      );
    });

    // Thriller-specific thematic clustering
    console.log('\n🎨 THRILLER SUB-GENRE CLUSTERS');
    const thematicTerms = {
      'Psychological Thrillers': ['mind', 'mental', 'psychology', 'memory', 'dreams', 'identity', 'self', 'brain', 'psycho'],
      'Crime Thrillers': ['murder', 'killer', 'detective', 'police', 'crime', 'investigation', 'case', 'evidence', 'suspect'],
      'Action Thrillers': ['chase', 'escape', 'run', 'hunt', 'pursuit', 'target', 'mission', 'operation', 'agent'],
      'Conspiracy Thrillers': ['conspiracy', 'government', 'secret', 'cover', 'truth', 'lies', 'betrayal', 'plot', 'scheme'],
      'Supernatural Thrillers': ['ghost', 'spirit', 'paranormal', 'supernatural', 'haunted', 'curse', 'demon', 'occult'],
      'Tech/Cyber Thrillers': ['network', 'digital', 'cyber', 'hacker', 'computer', 'internet', 'data', 'system'],
      'Medical Thrillers': ['doctor', 'hospital', 'medical', 'virus', 'disease', 'patient', 'surgery', 'treatment'],
      'Legal Thrillers': ['lawyer', 'court', 'trial', 'judge', 'jury', 'legal', 'justice', 'law', 'attorney'],
      'Espionage Thrillers': ['spy', 'agent', 'intelligence', 'cia', 'fbi', 'operative', 'surveillance', 'undercover'],
      'Survival Thrillers': ['survival', 'trapped', 'lost', 'wilderness', 'danger', 'threat', 'rescue', 'escape']
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

    // Temporal analysis
    console.log('\n📅 THRILLER EVOLUTION BY DECADE');
    const eraTerms = new Map();
    
    documents.forEach(doc => {
      if (doc.year) {
        const decade = Math.floor(doc.year / 10) * 10;
        if (!eraTerms.has(decade)) {
          eraTerms.set(decade, new Map());
        }
        
        doc.tokens.forEach(token => {
          const decadeMap = eraTerms.get(decade);
          decadeMap.set(token, (decadeMap.get(token) || 0) + 1);
        });
      }
    });

    console.log('\nTop thriller themes by decade:');
    for (const decade of [1980, 1990, 2000, 2010, 2020]) {
      if (eraTerms.has(decade)) {
        const topTerms = Array.from(eraTerms.get(decade).entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([term, freq]) => `${term}(${freq})`)
          .join(', ');
        console.log(`${decade}s: ${topTerms}`);
      }
    }

    // Create meaningful sub-genre proposals
    console.log('\n🎯 PROPOSED THRILLER SUB-GENRES');
    console.log('═══════════════════════════════════════════');
    
    const sortedClusters = Array.from(clusterStrengths.entries())
      .sort((a, b) => b[1].totalStrength - a[1].totalStrength);

    const subGenreProposals = this.createThrillerSubGenres(sortedClusters, thrillerData.movieCount, tfidfScores);
    
    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`📊 Total unique terms: ${tfidfScores.size}`);
    console.log(`🔤 Average terms per title: ${(tfidfScores.size / totalDocs).toFixed(2)}`);
    console.log(`🎬 Most common theme: ${commonTerms[0]?.term} (${commonTerms[0]?.docPercentage}% of movies)`);
    console.log(`⭐ Most distinctive: ${sortedTerms[0]?.term} (TF-IDF: ${sortedTerms[0]?.tfidf.toFixed(2)})`);
    
    // Compare to other genres
    console.log(`\n📈 Vocabulary Complexity Comparison:`);
    console.log(`   Animation: 1091 terms / 728 movies = 1.50 terms per movie`);
    console.log(`   Drama: 6821 terms / 8866 movies = 0.77 terms per movie`);
    console.log(`   Thriller: ${tfidfScores.size} terms / ${totalDocs} movies = ${(tfidfScores.size / totalDocs).toFixed(2)} terms per movie`);

    return {
      totalMovies: thrillerData.movieCount,
      totalTerms: tfidfScores.size,
      topDistinctive: sortedTerms.slice(0, 15),
      commonThemes: commonTerms.slice(0, 15),
      thematicClusters: clusterStrengths,
      subGenreProposals: subGenreProposals,
      vocabularyComplexity: tfidfScores.size / totalDocs
    };
  }

  createThrillerSubGenres(sortedClusters, totalMovies, tfidfScores) {
    console.log('\nBased on TF-IDF analysis, proposed Thriller sub-genres:');
    console.log('─'.repeat(65));

    const proposals = [];
    
    // Strategy: Group related clusters and create balanced sub-genres
    const strongClusters = sortedClusters.filter(([name, data]) => data.coverage > 20);
    
    // Group 1: Psychological + Supernatural (Mind-focused thrillers)
    const psychSupernatural = strongClusters.filter(([name]) => 
      name.includes('Psychological') || name.includes('Supernatural')
    );
    
    // Group 2: Crime + Legal + Medical (Investigation-focused thrillers)  
    const investigationThrillers = strongClusters.filter(([name]) =>
      name.includes('Crime') || name.includes('Legal') || name.includes('Medical')
    );
    
    // Group 3: Action + Espionage + Survival (Action-focused thrillers)
    const actionThrillers = strongClusters.filter(([name]) =>
      name.includes('Action') || name.includes('Espionage') || name.includes('Survival')
    );
    
    // Group 4: Conspiracy + Tech/Cyber (System-focused thrillers)
    const systemThrillers = strongClusters.filter(([name]) =>
      name.includes('Conspiracy') || name.includes('Tech')
    );

    const subGenreGroups = [
      {
        name: 'Psychological Thrillers',
        description: 'Mind games, supernatural elements, identity crises',
        clusters: psychSupernatural,
        estimatedSize: Math.floor(totalMovies * 0.25)
      },
      {
        name: 'Investigation Thrillers', 
        description: 'Crime solving, legal drama, medical mysteries',
        clusters: investigationThrillers,
        estimatedSize: Math.floor(totalMovies * 0.30)
      },
      {
        name: 'Action Thrillers',
        description: 'High-stakes action, espionage, survival scenarios',
        clusters: actionThrillers,
        estimatedSize: Math.floor(totalMovies * 0.25)
      },
      {
        name: 'Conspiracy Thrillers',
        description: 'Government plots, tech conspiracies, system corruption',
        clusters: systemThrillers,
        estimatedSize: Math.floor(totalMovies * 0.20)
      }
    ];

    subGenreGroups.forEach(group => {
      const costEst = (group.estimatedSize * 0.0061).toFixed(2);
      const keyThemes = group.clusters
        .flatMap(([name, data]) => data.terms.slice(0, 3).map(t => t.term))
        .slice(0, 6);
      
      console.log(`${group.name}:`);
      console.log(`  Estimated size: ~${group.estimatedSize} movies`);
      console.log(`  Cost estimate: $${costEst}`);
      console.log(`  Description: ${group.description}`);
      console.log(`  Key themes: ${keyThemes.join(', ')}`);
      console.log('');
      
      proposals.push({
        name: group.name,
        estimatedSize: group.estimatedSize,
        costEstimate: parseFloat(costEst),
        description: group.description,
        keyThemes: keyThemes,
        clusters: group.clusters.map(([name]) => name)
      });
    });

    const totalCost = proposals.reduce((sum, p) => sum + p.costEstimate, 0);
    const originalCost = totalMovies * 0.0061;
    
    console.log('SUMMARY:');
    console.log(`Total movies: ${totalMovies}`);
    console.log(`Total estimated cost: $${totalCost.toFixed(2)}`);
    console.log(`Original full Thriller cost: $${originalCost.toFixed(2)}`);
    console.log(`Savings: $${(originalCost - totalCost).toFixed(2)} (${((originalCost - totalCost)/originalCost * 100).toFixed(1)}%)`);

    return proposals;
  }
}

async function main() {
  const analyzer = new ThrillerTFIDFAnalyzer();
  
  try {
    const results = await analyzer.calculateTFIDF();
    
    // Save results
    fs.writeFileSync('./thriller-tfidf-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Thriller TF-IDF analysis saved to: thriller-tfidf-analysis.json');
    
    console.log('\n✅ Thriller TF-IDF analysis complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}