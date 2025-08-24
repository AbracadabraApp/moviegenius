#!/usr/bin/env node

/**
 * Semantic Theme Clustering System
 * 
 * Consolidates 200K+ micro-themes into substantial thematic lists
 * Generates thematic taxonomy as byproduct for future analysis
 */

import fs from 'fs';

class SemanticThemeClusterer {
  constructor() {
    this.stopWords = new Set([
      'films', 'movies', 'cinema', 'film', 'movie', 'the', 'and', 'or', 'in', 'with', 'about', 'of', 'for'
    ]);
    
    this.synonymGroups = {
      'mad_scientist': ['mad scientist', 'evil scientist', 'crazy scientist', 'scientist villain'],
      'war': ['war', 'military', 'combat', 'battlefield', 'wwii', 'vietnam'],
      'horror': ['horror', 'scary', 'frightening', 'terrifying', 'spooky'],
      'comedy': ['comedy', 'funny', 'humorous', 'comedic', 'comic'],
      'romance': ['romance', 'romantic', 'love story', 'love'],
      'documentary': ['documentary', 'docudrama', 'documentary style', 'cinema verite'],
      'noir': ['noir', 'neo-noir', 'film noir', 'dark cinema'],
      'coming_age': ['coming of age', 'coming-of-age', 'youth', 'adolescent', 'teen'],
      'playing_god': ['playing god', 'god complex', 'god complexes', 'playing god badly']
    };
  }

  /**
   * Main clustering method
   */
  async clusterThemes() {
    console.log('🔍 Loading and analyzing themes for semantic clustering...');
    
    // Load all themes
    const allThemes = JSON.parse(fs.readFileSync('./generated-lists-batch/all-themes.json', 'utf8'));
    
    // Group themes by exact name to get movie counts
    const themeGroups = this.groupThemesByName(allThemes);
    console.log(`📊 Found ${Object.keys(themeGroups).length} unique theme names`);
    
    // Extract semantic signatures for clustering
    console.log('🧠 Extracting semantic signatures...');
    const themeSignatures = this.extractSemanticSignatures(themeGroups);
    
    // Perform clustering
    console.log('🔗 Clustering themes by semantic similarity...');
    const clusters = this.performClustering(themeSignatures);
    console.log(`📋 Generated ${clusters.length} semantic clusters`);
    
    // Build consolidated themes
    console.log('🎯 Building consolidated theme lists...');
    const consolidatedThemes = this.buildConsolidatedThemes(clusters, themeGroups);
    
    // Generate thematic taxonomy
    console.log('🌳 Generating thematic taxonomy...');
    const taxonomy = this.generateTaxonomy(clusters, consolidatedThemes);
    
    // Filter by size and quality
    const validThemes = consolidatedThemes.filter(theme => 
      theme.movieCount >= 5 && theme.movieCount <= 100
    );
    
    console.log(`\\n📊 Clustering Results:`);
    console.log(`  Original themes: ${Object.keys(themeGroups).length}`);
    console.log(`  Semantic clusters: ${clusters.length}`);
    console.log(`  Consolidated themes: ${consolidatedThemes.length}`);
    console.log(`  Valid themes (5-100 movies): ${validThemes.length}`);
    console.log(`  Taxonomy categories: ${Object.keys(taxonomy.categories).length}`);
    
    // Show sample results
    console.log(`\\n🎬 Sample Consolidated Themes:`);
    validThemes.slice(0, 10).forEach((theme, index) => {
      console.log(`${index + 1}. "${theme.canonicalName}" (${theme.movieCount} movies)`);
      console.log(`   Merged from: ${theme.sourceThemes.length} variants`);
      console.log(`   Taxonomy: ${theme.taxonomyPath}`);
    });
    
    // Save results
    const results = {
      metadata: {
        originalThemeCount: Object.keys(themeGroups).length,
        clusterCount: clusters.length,
        consolidatedThemeCount: consolidatedThemes.length,
        validThemeCount: validThemes.length,
        generatedAt: new Date().toISOString()
      },
      consolidatedThemes: validThemes,
      allConsolidatedThemes: consolidatedThemes,
      clusters: clusters,
      taxonomy: taxonomy,
      semanticMappings: this.synonymGroups
    };
    
    const outputPath = './generated-lists-batch/semantic-clustered-themes.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\\n💾 Results saved: ${outputPath}`);
    console.log(`🎯 Ready to deploy ${validThemes.length} consolidated theme lists`);
    
    return results;
  }

  /**
   * Group themes by exact name and count movies
   */
  groupThemesByName(allThemes) {
    const groups = {};
    
    for (const theme of allThemes) {
      const name = theme.listName;
      if (!groups[name]) {
        groups[name] = {
          name: name,
          slug: theme.slug,
          description: theme.description,
          category: theme.category,
          movies: new Map()
        };
      }
      
      // Add movie (use Map to avoid duplicates)
      groups[name].movies.set(theme.tmdbId, {
        tmdbId: theme.tmdbId,
        connectionReason: theme.connectionReason
      });
    }
    
    // Convert movies Map to Array and add count
    Object.values(groups).forEach(group => {
      group.movies = Array.from(group.movies.values());
      group.movieCount = group.movies.length;
    });
    
    return groups;
  }

  /**
   * Extract semantic signatures for each theme
   */
  extractSemanticSignatures(themeGroups) {
    const signatures = [];
    
    for (const [name, group] of Object.entries(themeGroups)) {
      const signature = this.createSemanticSignature(name, group);
      signatures.push({
        originalName: name,
        signature: signature,
        group: group
      });
    }
    
    return signatures;
  }

  /**
   * Create semantic signature for a theme name
   */
  createSemanticSignature(name, group) {
    const normalized = name.toLowerCase()
      .replace(/[^a-z0-9\\s]/g, ' ')  // Remove punctuation
      .replace(/\\s+/g, ' ')          // Normalize whitespace
      .trim();
    
    const words = normalized.split(' ')
      .filter(word => word.length > 2 && !this.stopWords.has(word));
    
    // Apply synonym mapping
    const mappedWords = words.map(word => {
      for (const [canonical, synonyms] of Object.entries(this.synonymGroups)) {
        if (synonyms.some(syn => word.includes(syn.replace(/\\s+/g, ' ')))) {
          return canonical;
        }
      }
      return word;
    });
    
    // Create signature components
    const wordSet = new Set(mappedWords);
    const keyWords = Array.from(wordSet).sort();
    
    return {
      words: keyWords,
      wordSet: wordSet,
      category: group.category,
      originalLength: words.length,
      semanticFingerprint: keyWords.join('_')
    };
  }

  /**
   * Perform semantic clustering
   */
  performClustering(signatures) {
    const clusters = [];
    const processed = new Set();
    
    for (const signature of signatures) {
      if (processed.has(signature.originalName)) continue;
      
      // Find all signatures similar to this one
      const cluster = this.findSimilarSignatures(signature, signatures, processed);
      
      if (cluster.length > 0) {
        clusters.push({
          id: clusters.length + 1,
          canonicalSignature: this.selectCanonicalSignature(cluster),
          members: cluster,
          movieCount: cluster.reduce((sum, sig) => sum + sig.group.movieCount, 0)
        });
        
        // Mark all members as processed
        cluster.forEach(sig => processed.add(sig.originalName));
      }
    }
    
    return clusters;
  }

  /**
   * Find signatures similar to the given signature
   */
  findSimilarSignatures(targetSignature, allSignatures, processed) {
    const similar = [targetSignature];
    
    for (const signature of allSignatures) {
      if (signature.originalName === targetSignature.originalName) continue;
      if (processed.has(signature.originalName)) continue;
      
      const similarity = this.calculateSimilarity(targetSignature.signature, signature.signature);
      
      // Cluster if high similarity (>= 0.6) or shared key concepts
      if (similarity >= 0.6 || this.hasSharedKeyConcepts(targetSignature.signature, signature.signature)) {
        similar.push(signature);
      }
    }
    
    return similar;
  }

  /**
   * Calculate semantic similarity between two signatures
   */
  calculateSimilarity(sig1, sig2) {
    const words1 = sig1.wordSet;
    const words2 = sig2.wordSet;
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Check if signatures share key concepts
   */
  hasSharedKeyConcepts(sig1, sig2) {
    const keyConcepts1 = sig1.words.filter(word => 
      Object.keys(this.synonymGroups).includes(word)
    );
    const keyConcepts2 = sig2.words.filter(word => 
      Object.keys(this.synonymGroups).includes(word)
    );
    
    return keyConcepts1.some(concept => keyConcepts2.includes(concept));
  }

  /**
   * Select the best canonical signature for a cluster
   */
  selectCanonicalSignature(cluster) {
    // Prefer signatures with more movies, then shorter names
    cluster.sort((a, b) => {
      const movieDiff = b.group.movieCount - a.group.movieCount;
      if (movieDiff !== 0) return movieDiff;
      return a.originalName.length - b.originalName.length;
    });
    
    return cluster[0];
  }

  /**
   * Build consolidated theme lists from clusters
   */
  buildConsolidatedThemes(clusters, originalGroups) {
    const consolidated = [];
    
    for (const cluster of clusters) {
      const canonical = cluster.canonicalSignature;
      
      // Collect all movies from cluster members
      const allMovies = new Map();
      const sourceThemes = [];
      
      for (const member of cluster.members) {
        sourceThemes.push({
          name: member.originalName,
          movieCount: member.group.movieCount
        });
        
        // Add movies from this theme
        member.group.movies.forEach(movie => {
          allMovies.set(movie.tmdbId, movie);
        });
      }
      
      const movieArray = Array.from(allMovies.values());
      
      consolidated.push({
        canonicalName: canonical.originalName,
        slug: canonical.group.slug,
        description: this.generateConsolidatedDescription(cluster),
        category: canonical.group.category,
        movies: movieArray,
        movieCount: movieArray.length,
        sourceThemes: sourceThemes,
        clusterSize: cluster.members.length,
        semanticSignature: canonical.signature.semanticFingerprint,
        taxonomyPath: this.generateTaxonomyPath(canonical.signature)
      });
    }
    
    // Sort by movie count descending
    consolidated.sort((a, b) => b.movieCount - a.movieCount);
    
    return consolidated;
  }

  /**
   * Generate consolidated description
   */
  generateConsolidatedDescription(cluster) {
    const canonical = cluster.canonicalSignature;
    const memberCount = cluster.members.length;
    
    if (memberCount > 1) {
      return `${canonical.group.description} (consolidated from ${memberCount} related themes)`;
    }
    return canonical.group.description;
  }

  /**
   * Generate taxonomy path for a signature
   */
  generateTaxonomyPath(signature) {
    const category = signature.category;
    const keyWords = signature.words.slice(0, 2); // Top 2 semantic concepts
    
    return `${category} > ${keyWords.join(' > ')}`;
  }

  /**
   * Generate comprehensive thematic taxonomy
   */
  generateTaxonomy(clusters, consolidatedThemes) {
    const taxonomy = {
      categories: {},
      semanticConcepts: {},
      hierarchies: {}
    };
    
    // Build category taxonomy
    for (const theme of consolidatedThemes) {
      const category = theme.category;
      if (!taxonomy.categories[category]) {
        taxonomy.categories[category] = {
          themes: [],
          totalMovies: 0,
          avgMoviesPerTheme: 0
        };
      }
      
      taxonomy.categories[category].themes.push({
        name: theme.canonicalName,
        movieCount: theme.movieCount,
        sourceThemes: theme.sourceThemes.length
      });
      taxonomy.categories[category].totalMovies += theme.movieCount;
    }
    
    // Calculate averages
    Object.values(taxonomy.categories).forEach(cat => {
      cat.avgMoviesPerTheme = Math.round(cat.totalMovies / cat.themes.length);
      cat.themes.sort((a, b) => b.movieCount - a.movieCount);
    });
    
    // Build semantic concept taxonomy
    for (const [concept, synonyms] of Object.entries(this.synonymGroups)) {
      const relatedThemes = consolidatedThemes.filter(theme =>
        theme.semanticSignature.includes(concept)
      );
      
      if (relatedThemes.length > 0) {
        taxonomy.semanticConcepts[concept] = {
          synonyms: synonyms,
          themes: relatedThemes.map(t => ({
            name: t.canonicalName,
            movieCount: t.movieCount
          })),
          totalThemes: relatedThemes.length,
          totalMovies: relatedThemes.reduce((sum, t) => sum + t.movieCount, 0)
        };
      }
    }
    
    return taxonomy;
  }
}

// Run the clustering
const clusterer = new SemanticThemeClusterer();
clusterer.clusterThemes()
  .then(results => {
    console.log('\\n🎉 Semantic theme clustering complete!');
    console.log(`📈 Consolidated ${results.metadata.originalThemeCount} themes into ${results.metadata.validThemeCount} substantial lists`);
    console.log(`🌳 Generated thematic taxonomy with ${Object.keys(results.taxonomy.categories).length} categories`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\\n💥 Clustering failed:', error.message);
    process.exit(1);
  });