/**
 * Person Link Validation System
 * 
 * Provides application-level validation for person links in movie analysis content
 * Prevents insertion of malformed person URLs and validates person ID references
 * 
 * Key Features:
 * - Format validation (numeric IDs vs name slugs)
 * - Person ID existence validation
 * - Content sanitization and auto-correction
 * - Comprehensive error reporting
 * - Performance-optimized regex patterns
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for person ID validation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Person Link Validation Class
 */
export class PersonLinkValidator {
  constructor(options = {}) {
    this.strictMode = options.strictMode ?? true;
    this.autoCorrect = options.autoCorrect ?? false;
    this.validateExistence = options.validateExistence ?? true;
    this.cache = new Map(); // Cache for person ID existence checks
  }

  /**
   * Validate person links in analysis content
   * @param {Object} analysisContent - Movie analysis content object
   * @returns {Object} Validation result with details
   */
  async validateAnalysisContent(analysisContent) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      correctedContent: null,
      statistics: {
        totalPersonLinks: 0,
        validLinks: 0,
        invalidFormatLinks: 0,
        nonExistentPersonIds: 0,
        correctedLinks: 0
      }
    };

    try {
      // Process different content sections
      if (analysisContent.processed_content) {
        await this._validateContentSection(
          analysisContent.processed_content,
          'processed_content',
          result
        );
      }

      if (analysisContent.sections) {
        for (const [sectionKey, sectionContent] of Object.entries(analysisContent.sections)) {
          await this._validateContentSection(
            sectionContent,
            `sections.${sectionKey}`,
            result
          );
        }
      }

      if (analysisContent.exploreFurther && Array.isArray(analysisContent.exploreFurther)) {
        for (let i = 0; i < analysisContent.exploreFurther.length; i++) {
          const item = analysisContent.exploreFurther[i];
          if (item.content) {
            await this._validateContentSection(
              item.content,
              `exploreFurther[${i}].content`,
              result
            );
          }
        }
      }

      // Generate corrected content if auto-correction is enabled
      if (this.autoCorrect && result.statistics.correctedLinks > 0) {
        result.correctedContent = await this._generateCorrectedContent(analysisContent);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push({
        type: 'VALIDATION_ERROR',
        message: `Validation failed: ${error.message}`,
        location: 'system'
      });
    }

    // Overall validation result
    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * Validate a single content section
   */
  async _validateContentSection(content, location, result) {
    if (!content || typeof content !== 'string') return;

    // Find all person links
    const personLinkPattern = /<a[^>]+href="\/person\/([^"]+)"[^>]*>/gi;
    let match;

    while ((match = personLinkPattern.exec(content)) !== null) {
      result.statistics.totalPersonLinks++;
      const personId = match[1];
      const fullMatch = match[0];
      const position = match.index;

      // Validate link format
      if (!this._isValidPersonIdFormat(personId)) {
        result.statistics.invalidFormatLinks++;
        result.errors.push({
          type: 'INVALID_FORMAT',
          message: `Person link uses name slug instead of numeric ID: /person/${personId}`,
          location,
          position,
          foundValue: personId,
          expectedFormat: 'numeric ID (e.g., 123)',
          fullMatch
        });
      } else {
        result.statistics.validLinks++;

        // Validate person ID exists (if enabled)
        if (this.validateExistence) {
          const exists = await this._checkPersonExists(personId);
          if (!exists) {
            result.statistics.nonExistentPersonIds++;
            result.warnings.push({
              type: 'PERSON_NOT_FOUND',
              message: `Person ID ${personId} referenced in link does not exist`,
              location,
              position,
              personId: parseInt(personId),
              fullMatch
            });
          }
        }
      }
    }
  }

  /**
   * Check if person ID format is valid (numeric only)
   */
  _isValidPersonIdFormat(personId) {
    return /^[0-9]+$/.test(personId);
  }

  /**
   * Check if person ID exists in database (with caching)
   */
  async _checkPersonExists(personId) {
    const numericId = parseInt(personId);
    
    // Check cache first
    if (this.cache.has(numericId)) {
      return this.cache.get(numericId);
    }

    try {
      const { data, error } = await supabase
        .from('persons')
        .select('id')
        .eq('id', numericId)
        .single();

      const exists = !error && data;
      
      // Cache the result
      this.cache.set(numericId, exists);
      
      return exists;
    } catch (error) {
      console.warn(`Error checking person existence for ID ${numericId}:`, error);
      return false; // Assume doesn't exist on error
    }
  }

  /**
   * Generate corrected content with proper person links
   */
  async _generateCorrectedContent(analysisContent) {
    // This would implement auto-correction logic
    // For now, return original content
    // In a full implementation, this would:
    // 1. Map name slugs to person IDs
    // 2. Replace malformed links with correct ones
    // 3. Handle cases where mapping isn't possible
    
    return { ...analysisContent };
  }

  /**
   * Quick validation for single person link
   */
  static validatePersonLink(personLink) {
    const linkPattern = /href="\/person\/([^"]+)"/;
    const match = personLink.match(linkPattern);
    
    if (!match) {
      return { isValid: false, error: 'Not a valid person link format' };
    }

    const personId = match[1];
    const isNumeric = /^[0-9]+$/.test(personId);

    return {
      isValid: isNumeric,
      personId: isNumeric ? parseInt(personId) : null,
      error: isNumeric ? null : `Person ID should be numeric, got: ${personId}`
    };
  }

  /**
   * Extract all person IDs from content
   */
  static extractPersonIds(content) {
    if (!content || typeof content !== 'string') return [];

    const personIds = [];
    const personLinkPattern = /<a[^>]+href="\/person\/([0-9]+)"[^>]*>/gi;
    let match;

    while ((match = personLinkPattern.exec(content)) !== null) {
      personIds.push(parseInt(match[1]));
    }

    return [...new Set(personIds)]; // Remove duplicates
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries())
    };
  }
}

/**
 * Content Sanitizer for Person Links
 */
export class PersonLinkSanitizer {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient || supabase;
    this.nameToIdMap = new Map();
    this.initialized = false;
  }

  /**
   * Initialize with person name-to-ID mappings
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const { data: persons, error } = await this.supabase
        .from('persons')
        .select('id, name');

      if (error) {
        console.warn('Failed to load person mappings:', error);
        return;
      }

      // Build name-to-ID mapping
      persons.forEach(person => {
        // Create multiple mappings for different slug formats
        const normalizedName = person.name.toLowerCase();
        const slug = this._generateSlug(person.name);
        
        this.nameToIdMap.set(normalizedName, person.id);
        this.nameToIdMap.set(slug, person.id);
        this.nameToIdMap.set(person.name, person.id);
      });

      this.initialized = true;
      console.log(`PersonLinkSanitizer initialized with ${persons.length} person mappings`);
    } catch (error) {
      console.error('Error initializing PersonLinkSanitizer:', error);
    }
  }

  /**
   * Sanitize content by converting name slug links to ID links
   */
  async sanitizeContent(content) {
    if (!content || typeof content !== 'string') return content;

    await this.initialize();

    // Find all person links with name slugs
    const nameSlugPattern = /<a([^>]+)href="\/person\/([^0-9][^"]*)"([^>]*)>/gi;
    let sanitizedContent = content;
    const changes = [];

    let match;
    while ((match = nameSlugPattern.exec(content)) !== null) {
      const fullMatch = match[0];
      const beforeHref = match[1];
      const nameSlug = match[2];
      const afterHref = match[3];

      // Try to map name slug to person ID
      const personId = this._lookupPersonId(nameSlug);
      
      if (personId) {
        const correctedLink = `<a${beforeHref}href="/person/${personId}"${afterHref}>`;
        sanitizedContent = sanitizedContent.replace(fullMatch, correctedLink);
        
        changes.push({
          type: 'CORRECTED',
          original: fullMatch,
          corrected: correctedLink,
          nameSlug,
          personId
        });
      } else {
        changes.push({
          type: 'UNRESOLVED',
          original: fullMatch,
          nameSlug,
          reason: 'No matching person ID found'
        });
      }
    }

    return {
      content: sanitizedContent,
      changes,
      hasChanges: changes.length > 0
    };
  }

  /**
   * Lookup person ID from name slug
   */
  _lookupPersonId(nameSlug) {
    // Try exact match first
    if (this.nameToIdMap.has(nameSlug)) {
      return this.nameToIdMap.get(nameSlug);
    }

    // Try with slug normalization
    const normalizedSlug = nameSlug.toLowerCase().replace(/-/g, ' ');
    if (this.nameToIdMap.has(normalizedSlug)) {
      return this.nameToIdMap.get(normalizedSlug);
    }

    // Try fuzzy matching (last resort)
    for (const [name, id] of this.nameToIdMap) {
      if (name.toLowerCase().includes(normalizedSlug.toLowerCase()) ||
          normalizedSlug.toLowerCase().includes(name.toLowerCase())) {
        return id;
      }
    }

    return null;
  }

  /**
   * Generate slug from name (for mapping purposes)
   */
  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

/**
 * Pre-insertion validation middleware
 */
export function createPersonLinkValidationMiddleware(options = {}) {
  const validator = new PersonLinkValidator(options);

  return async function validatePersonLinks(analysisContent) {
    const validation = await validator.validateAnalysisContent(analysisContent);
    
    if (!validation.isValid && options.throwOnError) {
      const error = new Error('Person link validation failed');
      error.validation = validation;
      throw error;
    }

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      content: validation.correctedContent || analysisContent
    };
  };
}

// Default validator instance
export const defaultPersonLinkValidator = new PersonLinkValidator();
export const defaultPersonLinkSanitizer = new PersonLinkSanitizer();