// lib/entity-linking/MovieRegistry.js
import { slugGenerator } from './SlugGenerator.js';

/**
 * Movie registry using existing discovered-movies.json data
 * Provides intelligent movie detection and linking capabilities
 */
export class MovieRegistry {
  constructor() {
    this.movies = new Map();
    this.titleIndex = new Map(); // normalized title -> movie
    this.yearIndex = new Map(); // year -> movies[]
    this.loaded = false;
    this.loadPromise = null;
  }

  /**
   * Load movie data from existing discovered-movies.json
   */
  async load() {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = this._doLoad();
    return this.loadPromise;
  }

  async _doLoad() {
    try {
      // Load existing discovered movies data
      const moviesModule = await import('../../data/discovered-movies.json');
      const movies = moviesModule.default || [];
      
      this.buildIndexes(movies);
      this.loaded = true;
      
      console.log(`MovieRegistry loaded: ${movies.length} movies`);
    } catch (error) {
      console.warn('Could not load movie registry:', error);
      this.loaded = true; // Mark as loaded to prevent retries
    }
  }

  /**
   * Build search indexes for fast movie lookup
   */
  buildIndexes(movies) {
    this.movies.clear();
    this.titleIndex.clear();
    this.yearIndex.clear();

    movies.forEach(movie => {
      // Ensure movie has required fields
      const processedMovie = {
        ...movie,
        searchTitle: this.normalizeTitle(movie.title),
        url: movie.url || `/movie/${movie.slug}`,
        id: movie.id || movie.slug
      };

      // Index by slug/id
      this.movies.set(processedMovie.slug, processedMovie);
      if (processedMovie.id !== processedMovie.slug) {
        this.movies.set(processedMovie.id, processedMovie);
      }

      // Index by normalized title
      this.titleIndex.set(processedMovie.searchTitle, processedMovie);
      
      // Index by title without articles
      const titleWithoutArticles = this.removeArticles(processedMovie.searchTitle);
      if (titleWithoutArticles !== processedMovie.searchTitle) {
        this.titleIndex.set(titleWithoutArticles, processedMovie);
      }

      // Index by year
      if (processedMovie.year) {
        if (!this.yearIndex.has(processedMovie.year)) {
          this.yearIndex.set(processedMovie.year, []);
        }
        this.yearIndex.get(processedMovie.year).push(processedMovie);
      }

      // Index alternative titles if available
      if (processedMovie.alternativeTitles && Array.isArray(processedMovie.alternativeTitles)) {
        processedMovie.alternativeTitles.forEach(altTitle => {
          const normalizedAlt = this.normalizeTitle(altTitle);
          this.titleIndex.set(normalizedAlt, processedMovie);
        });
      }
    });
  }

  /**
   * Normalize title for consistent searching
   * Updated to preserve important punctuation like apostrophes and question marks
   */
  normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s'?!,:-]/g, '') // Keep apostrophes, question marks, exclamation, commas, colons, dashes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Remove articles from title
   */
  removeArticles(title) {
    return title.replace(/^(the|a|an)\s+/i, '');
  }

  /**
   * Find movie by title and optional year
   */
  async findMovie(title, year = null, context = 'general') {
    await this.load();
    
    if (!title || typeof title !== 'string') return null;
    
    const normalizedTitle = this.normalizeTitle(title);
    
    // 1. Direct title lookup
    let movie = this.titleIndex.get(normalizedTitle);
    if (movie && (!year || movie.year === year)) {
      return movie;
    }

    // 2. Title without articles
    const titleWithoutArticles = this.removeArticles(normalizedTitle);
    movie = this.titleIndex.get(titleWithoutArticles);
    if (movie && (!year || movie.year === year)) {
      return movie;
    }

    // 3. Year-based filtering if year provided
    if (year && this.yearIndex.has(year)) {
      const moviesInYear = this.yearIndex.get(year);
      movie = moviesInYear.find(m => 
        m.searchTitle === normalizedTitle || 
        this.removeArticles(m.searchTitle) === titleWithoutArticles
      );
      if (movie) return movie;
    }

    // 4. Fuzzy matching
    return this.fuzzyTitleMatch(normalizedTitle, year);
  }

  /**
   * Fuzzy matching for partial titles and variations
   */
  fuzzyTitleMatch(normalizedTitle, year = null) {
    const titleWords = normalizedTitle.split(/\s+/);
    
    // Single word titles - look for exact matches
    if (titleWords.length === 1) {
      for (const movie of this.movies.values()) {
        const searchTitle = movie.searchTitle || this.normalizeTitle(movie.title || '');
        const movieWords = searchTitle.split(/\s+/);
        if (movieWords.includes(titleWords[0]) && (!year || movie.year === year)) {
          return movie;
        }
      }
    }

    // Multi-word partial matching
    if (titleWords.length >= 2) {
      for (const movie of this.movies.values()) {
        const searchTitle = movie.searchTitle || this.normalizeTitle(movie.title || '');
        const movieWords = searchTitle.split(/\s+/);
        
        // Check if significant portion of words match
        const matchingWords = titleWords.filter(word => 
          movieWords.some(movieWord => movieWord.includes(word))
        );
        
        const matchRatio = matchingWords.length / titleWords.length;
        if (matchRatio >= 0.7 && (!year || movie.year === year)) {
          return movie;
        }
      }
    }

    return null;
  }

  /**
   * Detect movies in text
   */
  async detectMovies(text, context = 'general') {
    await this.load();
    
    const detectedMovies = [];
    const processedPositions = new Set();

    // Multiple detection strategies
    const strategies = [
      () => this.detectTitleWithYearMatches(text, context),
      () => this.detectQuotedTitleMatches(text, context),
      () => this.detectExactTitleMatches(text, context),
      () => this.detectPartialTitleMatches(text, context)
    ];

    for (const strategy of strategies) {
      const matches = await strategy();
      for (const match of matches) {
        // Avoid overlapping matches
        if (!this.hasPositionOverlap(match, processedPositions)) {
          detectedMovies.push(match);
          this.markPositionUsed(match, processedPositions);
        }
      }
    }

    return this.rankAndFilterMatches(detectedMovies);
  }

  /**
   * Detect "Title (Year)" or "Title Year" patterns
   */
  async detectTitleWithYearMatches(text, context) {
    const matches = [];
    
    // Patterns: "Movie Title (YYYY)" or "Movie Title YYYY"
    // Updated to handle punctuation like "What Happened, Miss Simone? (2015)"
    const yearPatterns = [
      // "Title (YYYY)" - allows punctuation within title, stops at sentence boundaries
      /([^.\n]+?)\s*\((\d{4})\)/g,
      // "Title YYYY" - more restrictive to avoid false matches
      /([A-Z][^.\n!?]*?)\s+(\d{4})\b(?!\s*[a-z])/g
    ];

    for (const pattern of yearPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const titleCandidate = match[1].trim();
        const year = parseInt(match[2]);
        
        console.log(`🔍 Entity linking detected: "${titleCandidate}" (${year})`);
        
        // Clean up title candidate - remove leading/trailing punctuation
        const cleanTitle = titleCandidate.replace(/^[^\w\s'"]+|[^\w\s'"]+$/g, '').trim();
        
        // Skip if title is too short or contains obvious non-title words
        if (cleanTitle.length < 2 || this.containsNonTitleWords(cleanTitle)) {
          continue;
        }
        
        const movie = await this.findMovie(cleanTitle, year, context);
        if (movie) {
          console.log(`✅ Entity linking found: "${cleanTitle}" (${year}) -> ${movie.slug}`);
          matches.push({
            movie,
            text: match[0].trim(),
            start: match.index,
            end: match.index + match[0].length,
            confidence: 0.95,
            type: 'title_with_year',
            context
          });
        } else {
          console.log(`❌ Entity linking failed: "${cleanTitle}" (${year}) - not found in registry`);
        }
      }
    }
    
    return matches;
  }

  /**
   * Detect quoted movie titles
   */
  async detectQuotedTitleMatches(text, context) {
    const matches = [];
    
    // Pattern: "Movie Title" or 'Movie Title'
    const quotedPattern = /["']([^"']{2,50})["']/g;
    let match;
    
    while ((match = quotedPattern.exec(text)) !== null) {
      const titleCandidate = match[1].trim();
      
      // Skip if contains non-title indicators
      if (this.containsNonTitleWords(titleCandidate)) {
        continue;
      }
      
      const movie = await this.findMovie(titleCandidate, null, context);
      if (movie) {
        matches.push({
          movie,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.90,
          type: 'quoted_title',
          context
        });
      }
    }
    
    return matches;
  }

  /**
   * Detect exact title matches
   */
  async detectExactTitleMatches(text, context) {
    const matches = [];
    
    // Only check for longer, distinctive titles to avoid false positives
    for (const movie of this.movies.values()) {
      if (movie.title.length < 4) continue; // Skip very short titles
      
      const titlePattern = new RegExp(`\\b${this.escapeRegex(movie.title)}\\b`, 'gi');
      let match;
      
      while ((match = titlePattern.exec(text)) !== null) {
        matches.push({
          movie,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85,
          type: 'exact_title',
          context
        });
      }
    }
    
    return matches;
  }

  /**
   * Detect partial title matches for multi-word titles
   */
  async detectPartialTitleMatches(text, context) {
    const matches = [];
    
    for (const movie of this.movies.values()) {
      const titleWords = movie.title.split(/\s+/);
      if (titleWords.length <= 2) continue; // Only for multi-word titles
      
      // Try matching first few words
      const partialTitle = titleWords.slice(0, -1).join(' ');
      if (partialTitle.length < 6) continue; // Skip very short partial titles
      
      const partialPattern = new RegExp(`\\b${this.escapeRegex(partialTitle)}\\b`, 'gi');
      let match;
      
      while ((match = partialPattern.exec(text)) !== null) {
        matches.push({
          movie,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.70,
          type: 'partial_title',
          context
        });
      }
    }
    
    return matches;
  }

  /**
   * Check if text contains words that suggest it's not a movie title
   * Updated to be less restrictive for actual movie titles
   */
  containsNonTitleWords(text) {
    const nonTitleWords = [
      'said', 'says', 'told', 'asked', 'replied', 'mentioned',
      'think', 'believe', 'feel', 'know', 'remember',
      'today', 'yesterday', 'tomorrow', 'now', 'then'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    // Require multiple non-title words or specific conversation indicators
    const nonTitleCount = words.filter(word => nonTitleWords.includes(word)).length;
    return nonTitleCount >= 2 || words.includes('said') || words.includes('told');
  }

  /**
   * Create movie links in text
   */
  async linkMovies(text, detectedMovies) {
    let linkedText = text;
    let linksCreated = 0;

    // Sort by position (reverse order to maintain text positions)
    const sortedMovies = [...detectedMovies].sort((a, b) => b.start - a.start);

    for (const movieMatch of sortedMovies) {
      const movie = movieMatch.movie;
      const cssClass = 'movie-title';
      
      let linkHTML;
      if (movieMatch.type === 'title_with_year') {
        // For "Title (Year)" - only link the title, keep year unlinked
        const match = movieMatch.text.match(/^(.+?)\s*\((\d{4})\)$/);
        if (match) {
          const title = match[1].trim();
          const year = match[2];
          linkHTML = `<a href="/movie/${movie.tmdb_id || movie.slug}" class="${cssClass}" data-movie-id="${movie.id}" data-confidence="${movieMatch.confidence}">${title}</a> (${year})`;
        } else {
          // Fallback if regex doesn't match
          linkHTML = `<a href="/movie/${movie.tmdb_id || movie.slug}" class="${cssClass}" data-movie-id="${movie.id}" data-confidence="${movieMatch.confidence}">${movieMatch.text}</a>`;
        }
      } else {
        // For other types, link the whole text
        linkHTML = `<a href="/movie/${movie.tmdb_id || movie.slug}" class="${cssClass}" data-movie-id="${movie.id}" data-confidence="${movieMatch.confidence}">${movieMatch.text}</a>`;
      }
      
      linkedText = linkedText.slice(0, movieMatch.start) + linkHTML + linkedText.slice(movieMatch.end);
      linksCreated++;
    }

    return {
      text: linkedText,
      linksCreated
    };
  }

  /**
   * Utility methods
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  hasPositionOverlap(match, processedPositions) {
    for (let i = match.start; i < match.end; i++) {
      if (processedPositions.has(i)) return true;
    }
    return false;
  }

  markPositionUsed(match, processedPositions) {
    for (let i = match.start; i < match.end; i++) {
      processedPositions.add(i);
    }
  }

  rankAndFilterMatches(matches) {
    // Sort by confidence, then by specificity (title+year > quoted > exact > partial)
    const typeWeights = {
      'title_with_year': 100,
      'quoted_title': 90,
      'exact_title': 80,
      'partial_title': 70
    };

    return matches
      .sort((a, b) => {
        const aWeight = typeWeights[a.type] || 0;
        const bWeight = typeWeights[b.type] || 0;
        
        if (bWeight !== aWeight) {
          return bWeight - aWeight;
        }
        
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        
        return (b.end - b.start) - (a.end - a.start);
      })
      .slice(0, 20); // Limit to top 20 matches
  }

  /**
   * Get movie by slug
   */
  async getMovie(slug) {
    await this.load();
    return this.movies.get(slug) || null;
  }

  /**
   * Get registry statistics
   */
  async getStats() {
    await this.load();
    
    const yearStats = {};
    for (const movie of this.movies.values()) {
      if (movie.year) {
        yearStats[movie.year] = (yearStats[movie.year] || 0) + 1;
      }
    }
    
    return {
      totalMovies: this.movies.size,
      yearRange: {
        earliest: Math.min(...Object.keys(yearStats).map(Number)),
        latest: Math.max(...Object.keys(yearStats).map(Number))
      },
      moviesPerYear: yearStats,
      loaded: this.loaded
    };
  }
}

// Singleton instance for app-wide use
export const movieRegistry = new MovieRegistry();