/**
 * Enhanced Analysis Generator Prompt
 * 
 * Generates movie analyses with:
 * - Contextual subheads (not generic types)
 * - Optimal length content (400-450 words total)
 * - No component parts (clean standalone text)
 * - Cost-optimized prompt structure
 * 
 * LESSONS LEARNED FROM MORE IDEAS OPTIMIZATION:
 * 1. Shorter prompts maintain quality while cutting costs significantly
 * 2. JSON-only responses are more reliable than mixed formats
 * 3. Clear structure guidelines work better than verbose examples
 * 4. Specific word counts prevent over-generation
 */

import { CORE_VOICE } from './core.js';

export const ENHANCED_ANALYSIS_PROMPT = `${CORE_VOICE}

Generate movie analysis for: {{FILM_TITLE}}

Create 4 sections (TOTAL 400-450 words):
1. Story/Plot (contextual subhead)
2. Performances (contextual subhead) 
3. Filmmaking (contextual subhead)
4. Cultural Impact (contextual subhead)

WORD COUNT IS CRITICAL: As you write, count words one by one (ignoring JSON formatting). Keep a running tally: "Section 1: 95 words, Section 2: 105 words, Section 3: 115 words..." Stop periodically to check your count. Continue writing until you reach exactly 400-450 total words. Sections can vary naturally as long as total hits target.

Requirements:
- Contextual subheads (2-4 words, not generic)
- Include movie/person links naturally
- Specific scenes and technical details
- 1 critique point in sections 2-4
- Reference 2-3 comparison films

JSON only:
{
  "sections": [
    {"subhead": "Contextual Title", "text": "Analysis with links..."}
  ],
  "keyElements": {
    "genre": "Primary/Secondary",
    "director": "Director Name", 
    "year": {{YEAR}}
  }
}`;

/**
 * Generate Enhanced Analysis for a movie
 * @param {string} movieTitle - Movie title and year
 * @returns {string} Formatted prompt ready for API call
 */
export function buildEnhancedAnalysisPrompt(movieTitle, year) {
  return ENHANCED_ANALYSIS_PROMPT
    .replace('{{FILM_TITLE}}', movieTitle)
    .replace('{{YEAR}}', year);
}

/**
 * Minimal validation configuration - structure only
 */
export const ANALYSIS_VALIDATION_CONFIG = {
  minSections: 4,
  maxSections: 4,
  requiredFields: ['sections', 'keyElements']
  // Content validation removed - save all valid JSON structures
};

/**
 * Validate Enhanced Analysis response format
 * @param {Object} response - Parsed JSON response from API
 * @param {Object} config - Validation configuration (optional)
 * @returns {Object} Validation result with errors if any
 */
export function validateAnalysisResponse(response, config = ANALYSIS_VALIDATION_CONFIG) {
  const errors = [];
  
  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['Invalid response format'], wordCount: 0 };
  }
  
  if (!response.sections || !Array.isArray(response.sections)) {
    errors.push('Missing or invalid sections array');
    return { valid: false, errors, wordCount: 0 };
  }
  
  // Check section count
  const sectionCount = response.sections.length;
  if (sectionCount < config.minSections || sectionCount > config.maxSections) {
    errors.push(`Should have ${config.minSections}-${config.maxSections} sections, got: ${sectionCount}`);
  }
  
  // Check each section
  response.sections.forEach((section, index) => {
    if (!section.subhead?.trim()) {
      errors.push(`Section ${index + 1} missing subhead`);
    }
    
    if (!section.text?.trim()) {
      errors.push(`Section ${index + 1} missing text`);
    }
    // Content validation removed - save all valid JSON structures
  });
  
  // Total word count validation removed
  
  // Check required fields
  config.requiredFields.forEach(field => {
    if (!response[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cost estimation for analysis generation
 */
export const ANALYSIS_COST_ESTIMATE = {
  inputTokens: 300,          // Streamlined prompt (40% reduction)
  outputTokens: 400,         // 375-425 word analysis
  costPerAnalysis: 0.0069,   // ~$0.007 per analysis
  totalFor21K: 147           // ~$147 for all 21K analyses (vs ~$250 unoptimized)
};

/**
 * Example usage
 */
export const EXAMPLE_USAGE = {
  simple: () => buildEnhancedAnalysisPrompt("Fight Club", 1999),
  classic: () => buildEnhancedAnalysisPrompt("Citizen Kane", 1941),  
  foreign: () => buildEnhancedAnalysisPrompt("Seven Samurai", 1954)
};