// lib/entity-linking/PersonRegistry-ID-Based.js
// UPDATED VERSION: Uses person IDs instead of name slugs for links

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * ID-Based Person Registry
 * 
 * Updated version that generates person links using numeric IDs instead of name slugs
 * Links format: /person/123 (not /person/christopher-nolan)
 * 
 * Key Changes from Original:
 * - Uses database persons table instead of JSON files
 * - Generates links with person.id instead of person.slug  
 * - Includes validation for person link format
 * - Caches database queries for performance
 */
export class PersonRegistry {
  constructor() {
    this.personCache = new Map(); // id -> person data
    this.nameToIdIndex = new Map(); // normalized name -> person id
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize registry from database
   */
  async initialize() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('🔄 Initializing PersonRegistry from database...');
      
      const { data: persons, error } = await supabase
        .from('persons')
        .select('id, name, created_at')
        .order('id');

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Build indexes
      this.personCache.clear();
      this.nameToIdIndex.clear();

      persons.forEach(person => {
        this.personCache.set(person.id, person);
        
        // Create multiple name variations for lookup
        const normalizedName = person.name.toLowerCase().trim();
        this.nameToIdIndex.set(normalizedName, person.id);
        
        // Add common name variations
        const nameParts = normalizedName.split(/\s+/);
        if (nameParts.length >= 2) {
          // Last name only (for film context)
          const lastName = nameParts[nameParts.length - 1];
          if (lastName.length > 2) {
            this.nameToIdIndex.set(lastName, person.id);
          }
          
          // First name + last name
          if (nameParts.length >= 2) {
            const firstLast = `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
            this.nameToIdIndex.set(firstLast, person.id);
          }
        }
      });

      this.initialized = true;
      console.log(`✅ PersonRegistry initialized: ${persons.length} people, ${this.nameToIdIndex.size} name variations`);
    } catch (error) {
      console.error('❌ PersonRegistry initialization failed:', error);
      this.initialized = true; // Prevent retry loops
      throw error;
    }
  }

  /**
   * Find person by name with intelligent matching
   */
  async findPerson(name, context = 'general') {
    await this.initialize();

    if (!name || typeof name !== 'string') return null;

    const normalizedName = name.toLowerCase().trim();

    // Direct lookup
    const personId = this.nameToIdIndex.get(normalizedName);
    if (personId) {
      return this.personCache.get(personId);
    }

    // Context-aware single name matching
    if (context === 'film-discussion' || context === 'movie-page') {
      // Try partial matching for film context
      return this._fuzzyMatch(normalizedName);
    }

    return null;
  }

  /**
   * Get person by ID
   */
  async getPersonById(personId) {
    await this.initialize();
    return this.personCache.get(personId) || null;
  }

  /**
   * Fuzzy matching for partial names
   */
  _fuzzyMatch(normalizedName) {
    const words = normalizedName.split(/\s+/);

    // Single word matching (surnames in film context)
    if (words.length === 1) {
      const word = words[0];
      for (const [indexedName, personId] of this.nameToIdIndex) {
        const nameWords = indexedName.split(/\s+/);
        if (nameWords.length > 1 && nameWords[nameWords.length - 1] === word) {
          return this.personCache.get(personId);
        }
      }
    }

    // Multi-word partial matching
    for (const [indexedName, personId] of this.nameToIdIndex) {
      const indexedWords = indexedName.split(/\s+/);
      
      const allWordsMatch = words.every(word =>
        indexedWords.some(indexedWord => indexedWord.includes(word))
      );

      if (allWordsMatch) {
        return this.personCache.get(personId);
      }
    }

    return null;
  }

  /**
   * Detect people in text content
   */
  async detectPeople(text, context = 'general') {
    await this.initialize();

    const detectedPeople = [];
    const processedPositions = new Set();

    // Detection strategies
    const strategies = [
      () => this._detectExactNameMatches(text, context),
      () => this._detectQuotedNameMatches(text, context),
      () => this._detectCommonNamePatterns(text, context)
    ];

    for (const strategy of strategies) {
      const matches = await strategy();
      for (const match of matches) {
        if (!this._hasPositionOverlap(match, processedPositions)) {
          detectedPeople.push(match);
          this._markPositionUsed(match, processedPositions);
        }
      }
    }

    return this._rankMatches(detectedPeople);
  }

  /**
   * Detect exact name matches
   */
  async _detectExactNameMatches(text, context) {
    const matches = [];

    for (const [name, personId] of this.nameToIdIndex) {
      if (name.split(/\s+/).length < 2) continue; // Skip single names in general detection
      
      const pattern = new RegExp(`\\b${this._escapeRegex(name)}\\b`, 'gi');
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const person = this.personCache.get(personId);
        if (person) {
          matches.push({
            person,
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            confidence: 0.95,
            type: 'exact_name'
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect quoted name matches
   */
  async _detectQuotedNameMatches(text, context) {
    const matches = [];
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
          type: 'quoted_name'
        });
      }
    }

    return matches;
  }

  /**
   * Detect common name patterns
   */
  async _detectCommonNamePatterns(text, context) {
    const matches = [];
    
    // Pattern: "Director Name" or "Name (director)"
    const directorPattern = /(?:director\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*\([^)]*director[^)]*\))?/gi;
    let match;

    while ((match = directorPattern.exec(text)) !== null) {
      const nameCandidate = match[1].trim();
      const person = await this.findPerson(nameCandidate, 'film-discussion');

      if (person) {
        matches.push({
          person,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.80,
          type: 'director_pattern'
        });
      }
    }

    return matches;
  }

  /**
   * Create person links in text - UPDATED TO USE PERSON IDs
   */
  async linkPeople(text, detectedPeople) {
    let linkedText = text;
    let linksCreated = 0;

    // Sort by position (reverse order to maintain text positions)
    const sortedPeople = [...detectedPeople].sort((a, b) => b.start - a.start);

    for (const personMatch of sortedPeople) {
      const person = personMatch.person;
      
      // CRITICAL FIX: Use person.id instead of person.slug
      const link = `<a href="/person/${person.id}" class="person-name" data-person-id="${person.id}" data-confidence="${personMatch.confidence}">${personMatch.text}</a>`;

      linkedText = linkedText.slice(0, personMatch.start) + link + linkedText.slice(personMatch.end);
      linksCreated++;
    }

    return {
      text: linkedText,
      linksCreated
    };
  }

  /**
   * Validate person links in content
   */
  validatePersonLinks(content) {
    const issues = [];
    const personLinkPattern = /<a[^>]+href="\/person\/([^"]+)"[^>]*>/gi;
    let match;

    while ((match = personLinkPattern.exec(content)) !== null) {
      const personId = match[1];
      const fullMatch = match[0];

      // Check if person ID is numeric
      if (!/^[0-9]+$/.test(personId)) {
        issues.push({
          type: 'INVALID_FORMAT',
          message: `Person link uses name slug instead of numeric ID: ${personId}`,
          link: fullMatch,
          position: match.index
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get registry statistics
   */
  async getStats() {
    await this.initialize();

    return {
      totalPeople: this.personCache.size,
      totalNameVariations: this.nameToIdIndex.size,
      initialized: this.initialized,
      lastInitialized: this.initPromise ? new Date().toISOString() : null
    };
  }

  /**
   * Add new person to registry
   */
  async addPerson(personData) {
    try {
      const { data: person, error } = await supabase
        .from('persons')
        .insert({ name: personData.name })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add person: ${error.message}`);
      }

      // Update cache
      this.personCache.set(person.id, person);
      const normalizedName = person.name.toLowerCase().trim();
      this.nameToIdIndex.set(normalizedName, person.id);

      console.log(`✅ Added person: ${person.name} (ID: ${person.id})`);
      return person;
    } catch (error) {
      console.error('❌ Failed to add person:', error);
      throw error;
    }
  }

  /**
   * Refresh registry from database
   */
  async refresh() {
    this.initialized = false;
    this.initPromise = null;
    await this.initialize();
  }

  /**
   * Utility methods
   */
  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _hasPositionOverlap(match, processedPositions) {
    for (let i = match.start; i < match.end; i++) {
      if (processedPositions.has(i)) return true;
    }
    return false;
  }

  _markPositionUsed(match, processedPositions) {
    for (let i = match.start; i < match.end; i++) {
      processedPositions.add(i);
    }
  }

  _rankMatches(matches) {
    return matches
      .sort((a, b) => {
        // Sort by confidence, then by length
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        return b.end - b.start - (a.end - a.start);
      })
      .slice(0, 25); // Limit matches
  }
}

/**
 * Enhanced linking function with validation
 */
export async function linkPeopleWithValidation(text, context = 'general', options = {}) {
  const registry = new PersonRegistry();
  
  try {
    // Detect people in text
    const detectedPeople = await registry.detectPeople(text, context);
    
    if (detectedPeople.length === 0) {
      return {
        text,
        linksCreated: 0,
        validationPassed: true
      };
    }

    // Create links
    const result = await registry.linkPeople(text, detectedPeople);
    
    // Validate the generated links
    const validation = registry.validatePersonLinks(result.text);
    
    if (!validation.isValid && options.throwOnInvalidLinks) {
      throw new Error(`Generated invalid person links: ${validation.issues.map(i => i.message).join(', ')}`);
    }

    return {
      ...result,
      validationPassed: validation.isValid,
      validationIssues: validation.issues
    };
  } catch (error) {
    console.error('Person linking failed:', error);
    return {
      text,
      linksCreated: 0,
      validationPassed: false,
      error: error.message
    };
  }
}

// Singleton instance
export const personRegistry = new PersonRegistry();