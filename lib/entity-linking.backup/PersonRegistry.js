// lib/entity-linking/PersonRegistry.js
import { slugGenerator } from './SlugGenerator.js';

/**
 * Person data registry with file-based storage and intelligent name matching
 * 
 * NAME VARIATION SYSTEM:
 * - Maps informal names to canonical forms ("Nolan" → "christopher-nolan")
 * - Context-aware matching (requires film context for single names)
 * - Confidence scoring based on specificity and context
 * - Fuzzy matching for partial names and typos
 * 
 * DATA SOURCES:
 * - people-registry.json: Core person database with bios, categories
 * - name-variations.json: Name mappings with confidence scores
 * 
 * DETECTION STRATEGIES (in priority order):
 * 1. Exact name matches: "Christopher Nolan" (confidence: 0.95)
 * 2. Variation matches: "Nolan" → "Christopher Nolan" (confidence: 0.85)
 * 3. Quoted names: "Martin Scorsese" (confidence: 0.85)
 * 4. Fuzzy matching: Partial names, last names only (confidence: 0.70)
 * 
 * CONTEXT AWARENESS:
 * - Single names like "Nolan" require film discussion context
 * - Full names work in any context
 * - Director surnames have higher confidence in film contexts
 * 
 * @example
 * // High confidence match in film context
 * await personRegistry.findPerson("Nolan", "film-discussion") 
 * // → { name: "Christopher Nolan", slug: "christopher-nolan", ... }
 * 
 * // No match in general context (prevents false positives)
 * await personRegistry.findPerson("Nolan", "general") 
 * // → null
 */
export class PersonRegistry {
  constructor() {
    this.people = new Map();
    this.nameIndex = new Map(); // name -> slug mapping
    this.variations = new Map(); // variations -> canonical slug
    this.loaded = false;
    this.loadPromise = null;
  }

  /**
   * Load person data from storage (async, cached)
   */
  async load() {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = this._doLoad();
    return this.loadPromise;
  }

  async _doLoad() {
    try {
      // Dynamic imports to avoid SSR issues
      const [peopleModule, variationsModule] = await Promise.all([
        import('../../data/people/people-registry.json'),
        import('../../data/people/name-variations.json')
      ]);
      
      const people = peopleModule.default || [];
      const variations = variationsModule.default || [];
      
      this.buildIndexes(people, variations);
      this.loaded = true;
      
      console.log(`PersonRegistry loaded: ${people.length} people, ${variations.length} variations`);
    } catch (error) {
      console.warn('Could not load person registry:', error);
      this.loaded = true; // Mark as loaded to prevent retries
    }
  }

  /**
   * Build search indexes for fast lookup
   */
  buildIndexes(people, variations) {
    // Clear existing indexes
    this.people.clear();
    this.nameIndex.clear();
    this.variations.clear();

    // Index people by slug
    people.forEach(person => {
      this.people.set(person.slug, person);
      
      // Index primary name (case-insensitive)
      const normalizedName = person.name.toLowerCase();
      this.nameIndex.set(normalizedName, person.slug);
      
      // Index known-for items as potential references
      if (person.knownFor && Array.isArray(person.knownFor)) {
        person.knownFor.forEach(work => {
          const workKey = `${normalizedName}-${work.toLowerCase()}`;
          this.nameIndex.set(workKey, person.slug);
        });
      }
    });

    // Index name variations
    variations.forEach(variation => {
      const normalizedName = variation.name.toLowerCase();
      this.variations.set(normalizedName, {
        slug: variation.canonicalSlug,
        confidence: variation.confidence || 0.8,
        context: variation.context,
        requireContext: variation.requireContext || false
      });
    });
  }

  /**
   * Find person by name with intelligent matching
   */
  async findPerson(name, context = 'general') {
    await this.load();
    
    if (!name || typeof name !== 'string') return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    // 1. Direct name lookup
    let slug = this.nameIndex.get(normalizedName);
    if (slug) {
      return this.people.get(slug);
    }

    // 2. Check name variations
    const variation = this.variations.get(normalizedName);
    if (variation) {
      // Check if context is required
      if (variation.requireContext && context === 'general') {
        return null; // Don't link single names without proper context
      }
      
      return this.people.get(variation.slug);
    }

    // 3. Try slug generation fallback
    const generatedSlug = slugGenerator.findCanonicalPersonSlug(name);
    const person = this.people.get(generatedSlug);
    if (person) {
      return person;
    }

    // 4. Fuzzy matching for partial names
    return this.fuzzyMatch(normalizedName, context);
  }

  /**
   * Fuzzy matching for partial names and typos
   */
  fuzzyMatch(normalizedName, context) {
    const words = normalizedName.split(/\s+/);
    
    // Single word matching (last names, etc.)
    if (words.length === 1) {
      const word = words[0];
      
      // Look for people whose last name matches
      for (const [personName, slug] of this.nameIndex) {
        const personWords = personName.split(/\s+/);
        if (personWords.length > 1 && personWords[personWords.length - 1] === word) {
          const person = this.people.get(slug);
          // Only return if context suggests this is appropriate
          if (context === 'film-discussion' || context === 'movie-page') {
            return person;
          }
        }
      }
    }

    // Multi-word partial matching
    if (words.length >= 2) {
      for (const [personName, slug] of this.nameIndex) {
        const personWords = personName.split(/\s+/);
        
        // Check if all search words appear in person name
        const allWordsMatch = words.every(word => 
          personWords.some(personWord => personWord.includes(word))
        );
        
        if (allWordsMatch) {
          return this.people.get(slug);
        }
      }
    }

    return null;
  }

  /**
   * Get person by slug
   */
  async getPerson(slug) {
    await this.load();
    return this.people.get(slug) || null;
  }

  /**
   * Search people by category
   */
  async getPeopleByCategory(category) {
    await this.load();
    const results = [];
    
    for (const person of this.people.values()) {
      if (person.category === category || 
          (person.subCategories && person.subCategories.includes(category))) {
        results.push(person);
      }
    }
    
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Detect people in text
   */
  async detectPeople(text, context = 'general') {
    await this.load();
    
    const detectedPeople = [];
    const processedPositions = new Set();

    // Multiple detection strategies
    const strategies = [
      () => this.detectExactNameMatches(text, context),
      () => this.detectVariationMatches(text, context),
      () => this.detectQuotedNameMatches(text, context)
    ];

    for (const strategy of strategies) {
      const matches = await strategy();
      for (const match of matches) {
        // Avoid overlapping matches
        if (!this.hasPositionOverlap(match, processedPositions)) {
          detectedPeople.push(match);
          this.markPositionUsed(match, processedPositions);
        }
      }
    }

    return this.rankAndFilterMatches(detectedPeople);
  }

  /**
   * Detect exact name matches in text
   */
  async detectExactNameMatches(text, context) {
    const matches = [];
    
    for (const person of this.people.values()) {
      const namePattern = new RegExp(`\\b${this.escapeRegex(person.name)}\\b`, 'gi');
      let match;
      
      while ((match = namePattern.exec(text)) !== null) {
        matches.push({
          person,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.95,
          type: 'exact_name',
          context
        });
      }
    }
    
    return matches;
  }

  /**
   * Detect name variation matches
   */
  async detectVariationMatches(text, context) {
    const matches = [];
    
    for (const [variation, data] of this.variations) {
      // Skip if context is required but not appropriate
      if (data.requireContext && context === 'general') {
        continue;
      }
      
      const pattern = new RegExp(`\\b${this.escapeRegex(variation)}\\b`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        const person = this.people.get(data.slug);
        if (person) {
          matches.push({
            person,
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: data.confidence,
            type: 'name_variation',
            context
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Detect quoted name matches
   */
  async detectQuotedNameMatches(text, context) {
    const matches = [];
    
    // Pattern: "Person Name" or 'Person Name'
    const quotedPattern = /["']([^"']+)["']/g;
    let match;
    
    while ((match = quotedPattern.exec(text)) !== null) {
      const nameCandidate = match[1].trim();
      const person = await this.findPerson(nameCandidate, context);
      
      if (person) {
        matches.push({
          person,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85,
          type: 'quoted_name',
          context
        });
      }
    }
    
    return matches;
  }

  /**
   * Create person links in text
   */
  async linkPeople(text, detectedPeople) {
    let linkedText = text;
    let linksCreated = 0;

    // Sort by position (reverse order to maintain text positions)
    const sortedPeople = [...detectedPeople].sort((a, b) => b.start - a.start);

    for (const personMatch of sortedPeople) {
      const person = personMatch.person;
      const link = `<a href="/person/${person.slug}" class="person-link" data-person-id="${person.slug}" data-confidence="${personMatch.confidence}">${personMatch.text}</a>`;
      
      linkedText = linkedText.slice(0, personMatch.start) + link + linkedText.slice(personMatch.end);
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
    // Sort by confidence, then by length (longer matches preferred)
    return matches
      .sort((a, b) => {
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        return (b.end - b.start) - (a.end - a.start);
      })
      .slice(0, 25); // Limit to top 25 matches
  }

  /**
   * Get registry statistics
   */
  async getStats() {
    await this.load();
    
    const categories = {};
    for (const person of this.people.values()) {
      categories[person.category] = (categories[person.category] || 0) + 1;
    }
    
    return {
      totalPeople: this.people.size,
      totalVariations: this.variations.size,
      categories,
      loaded: this.loaded
    };
  }

  /**
   * Add new person (for future admin functionality)
   */
  async addPerson(personData) {
    await this.load();
    
    const slug = slugGenerator.generatePersonSlug(personData.name);
    const person = {
      ...personData,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.people.set(slug, person);
    this.nameIndex.set(person.name.toLowerCase(), slug);
    
    return person;
  }
}

// Singleton instance for app-wide use
export const personRegistry = new PersonRegistry();