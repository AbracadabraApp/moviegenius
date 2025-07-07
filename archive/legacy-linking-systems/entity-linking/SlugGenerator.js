// lib/entity-linking/SlugGenerator.js

/**
 * Universal slug generation for people and movies
 * Handles name variations, title + year patterns, and clean URL generation
 */
export class SlugGenerator {
  constructor() {
    // Common name variations and their canonical forms
    this.nameVariations = new Map([
      // Directors
      ['chris nolan', 'christopher-nolan'],
      ['christopher nolan', 'christopher-nolan'],
      ['quentin tarantino', 'quentin-tarantino'],
      ['martin scorsese', 'martin-scorsese'],
      ['steven spielberg', 'steven-spielberg'],
      ['ridley scott', 'ridley-scott'],
      ['denis villeneuve', 'denis-villeneuve'],
      ['greta gerwig', 'greta-gerwig'],
      ['jordan peele', 'jordan-peele'],
      ['ari aster', 'ari-aster'],
      ['robert eggers', 'robert-eggers'],
      
      // Actors  
      ['meryl streep', 'meryl-streep'],
      ['robert de niro', 'robert-de-niro'],
      ['robert deniro', 'robert-de-niro'],
      ['de niro', 'robert-de-niro'],
      ['al pacino', 'al-pacino'],
      ['leonardo dicaprio', 'leonardo-dicaprio'],
      ['leo dicaprio', 'leonardo-dicaprio'],
      ['christian bale', 'christian-bale'],
      ['oscar isaac', 'oscar-isaac'],
      ['timothee chalamet', 'timothee-chalamet'],
      
      // Handle common variations
      ['dicaprio', 'leonardo-dicaprio'],
      ['scorsese', 'martin-scorsese'],
      ['tarantino', 'quentin-tarantino'],
      ['spielberg', 'steven-spielberg'],
      ['nolan', 'christopher-nolan']
    ]);

    // Movie title variations for better matching
    this.titleVariations = new Map([
      ['lotr', 'the-lord-of-the-rings'],
      ['star wars', 'star-wars'],
      ['the dark knight', 'the-dark-knight'],
      ['pulp fiction', 'pulp-fiction'],
      ['the godfather', 'the-godfather']
    ]);
  }

  /**
   * Generate person slug from name
   */
  generatePersonSlug(name) {
    if (!name) return null;
    
    const normalized = this.normalizeName(name);
    
    // Check for known variations first
    const knownSlug = this.nameVariations.get(normalized);
    if (knownSlug) return knownSlug;
    
    // Generate new slug
    return this.createSlugFromName(normalized);
  }

  /**
   * Generate movie slug from title and year
   */
  generateMovieSlug(title, year) {
    if (!title) return null;
    
    const baseSlug = this.normalizeTitle(title);
    
    // Check for known title variations
    const knownSlug = this.titleVariations.get(title.toLowerCase());
    if (knownSlug && year) {
      return `${knownSlug}-${year}`;
    }
    
    if (year) {
      return `${baseSlug}-${year}`;
    }
    
    return baseSlug;
  }

  /**
   * Normalize name for consistent processing
   */
  normalizeName(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' '); // Normalize spaces
  }

  /**
   * Normalize movie title for slug generation
   */
  normalizeTitle(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
      .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Create slug from normalized name
   */
  createSlugFromName(normalizedName) {
    return normalizedName
      .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Find canonical slug for name variations
   */
  findCanonicalPersonSlug(inputName) {
    const normalized = this.normalizeName(inputName);
    
    // Direct match
    if (this.nameVariations.has(normalized)) {
      return this.nameVariations.get(normalized);
    }
    
    // Partial match (last name only)
    const lastName = normalized.split(' ').pop();
    for (const [variation, slug] of this.nameVariations) {
      if (variation.endsWith(lastName) && variation.includes(' ')) {
        return slug;
      }
    }
    
    return this.generatePersonSlug(inputName);
  }

  /**
   * Parse movie slug to extract title and year
   */
  parseMovieSlug(slug) {
    const parts = slug.split('-');
    const yearMatch = parts[parts.length - 1].match(/^\d{4}$/);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      const titleParts = parts.slice(0, -1);
      const title = this.reconstructTitle(titleParts);
      return { title, year };
    }
    
    // No year in slug
    return { title: this.reconstructTitle(parts), year: null };
  }

  /**
   * Reconstruct title from slug parts
   */
  reconstructTitle(titleParts) {
    return titleParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Generate alternative slug patterns for better matching
   */
  generateMovieSlugVariations(title, year) {
    const patterns = [];
    
    // Main pattern
    patterns.push(this.generateMovieSlug(title, year));
    
    // Without year
    patterns.push(this.normalizeTitle(title));
    
    // With parentheses year format (for parsing from text)
    if (year) {
      patterns.push(`${this.normalizeTitle(title)}-${year}`);
    }
    
    // Abbreviated versions for long titles
    if (title.length > 30) {
      const abbreviated = this.abbreviateTitle(title);
      patterns.push(this.generateMovieSlug(abbreviated, year));
    }
    
    // Handle "The" prefix variations
    const withThe = `the-${this.normalizeTitle(title)}`;
    const withoutThe = this.normalizeTitle(title.replace(/^the\s+/i, ''));
    patterns.push(withThe);
    patterns.push(withoutThe);
    
    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Abbreviate long titles
   */
  abbreviateTitle(title) {
    const words = title.split(' ');
    if (words.length <= 3) return title;
    
    // Keep first 3 words for long titles
    return words.slice(0, 3).join(' ');
  }

  /**
   * Register new name variation
   */
  addNameVariation(variation, canonicalSlug) {
    const normalized = this.normalizeName(variation);
    this.nameVariations.set(normalized, canonicalSlug);
  }

  /**
   * Register new title variation
   */
  addTitleVariation(variation, canonicalSlug) {
    const normalized = variation.toLowerCase();
    this.titleVariations.set(normalized, canonicalSlug);
  }

  /**
   * Validate slug format
   */
  isValidSlug(slug) {
    if (!slug || typeof slug !== 'string') return false;
    
    // Basic slug pattern: lowercase letters, numbers, hyphens
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugPattern.test(slug);
  }

  /**
   * Extract potential person names from text for analysis
   */
  extractPotentialNames(text) {
    // Simple pattern for potential person names (2-3 capitalized words)
    const namePattern = /\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,2}\b/g;
    const matches = text.match(namePattern) || [];
    
    return matches.map(name => ({
      original: name,
      normalized: this.normalizeName(name),
      slug: this.generatePersonSlug(name)
    }));
  }

  /**
   * Extract potential movie titles from text for analysis
   */
  extractPotentialTitles(text) {
    const titles = [];
    
    // Quoted titles: "Movie Title"
    const quotedPattern = /["']([^"']+)["']/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      titles.push({
        original: match[1],
        slug: this.normalizeTitle(match[1]),
        confidence: 0.8,
        method: 'quoted'
      });
    }
    
    // Title with year: Movie Title (2023) or Movie Title 2023
    const yearPatterns = [
      /([^.\n]+)\s*\((\d{4})\)/g,
      /([^.\n]+)\s+(\d{4})\b/g
    ];
    
    for (const pattern of yearPatterns) {
      while ((match = pattern.exec(text)) !== null) {
        const titleCandidate = match[1].trim();
        const year = parseInt(match[2]);
        
        titles.push({
          original: titleCandidate,
          year: year,
          slug: this.generateMovieSlug(titleCandidate, year),
          confidence: 0.9,
          method: 'title_with_year'
        });
      }
    }
    
    return titles;
  }
}

// Singleton instance for app-wide use
export const slugGenerator = new SlugGenerator();