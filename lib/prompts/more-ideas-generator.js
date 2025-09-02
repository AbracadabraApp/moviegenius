/**
 * More Ideas Generator Prompt - Focused on movie recommendations
 * 
 * Generates 20-30 related movie recommendations with connection explanations
 * Ordered from closest connections to looser thematic links
 */

import { CORE_VOICE } from './core.js';

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG = {
  minRecommendations: 13,
  maxRecommendations: 17,
  connectionWordRange: [3, 20], // Under 20 words, focus on clarity over counts
  maxWordReuse: 15, // Very lenient - natural language over artificial variety
  maxTitleLength: 100,
  yearRange: [1900, new Date().getFullYear() + 2]
};

export const MORE_IDEAS_PROMPT = `${CORE_VOICE}

Generate 15 movie recommendations for: {{FILM_TITLE}}

Each recommendation should connect to the source film - similar themes, director, genre, mood, or style. 

Connection descriptions should be clear and helpful (under 20 words). Explain WHY someone who enjoyed the source film would like this recommendation.

GOOD examples:
- "Same director Martin Scorsese exploring obsession and urban isolation"
- "Similar mentor-student dynamic but set in the boxing world"
- "Shares the noir atmosphere and morally complex protagonist"

BAD examples:
- "Action movie crime elements" (too vague)
- "Director, genre, similar themes stuff" (awkward grammar)
- "Has violence and characters like the other film" (unclear)

JSON only:
{
  "moreIdeas": [{"title": "Movie", "year": 1999, "connection": "reason"}],
  "metadata": {"sourceMovie": "{{FILM_TITLE}}", "totalRecommendations": 15}
}`;

/**
 * Generate More Ideas recommendations for a movie
 * @param {string} movieTitle - Movie title and year
 * @returns {string} Formatted prompt ready for API call
 * @throws {Error} If movieTitle is invalid
 */
export function buildMoreIdeasPrompt(movieTitle) {
  if (!movieTitle?.trim()) {
    throw new Error('Movie title is required and cannot be empty');
  }
  
  return MORE_IDEAS_PROMPT
    .replace(/{{FILM_TITLE}}/g, movieTitle.trim())
    .replace('{{TIMESTAMP}}', new Date().toISOString());
}

/**
 * @typedef {Object} MovieRecommendation
 * @property {string} title
 * @property {number} year  
 * @property {string} connection
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 * @property {number} count
 * @property {number[]} connectionWordCounts
 * @property {number} avgConnectionLength
 */

/**
 * Validate More Ideas response format
 * @param {Object} response - Parsed JSON response from API
 * @param {Object} config - Validation configuration (optional)
 * @returns {ValidationResult} Validation result with errors if any
 */
export function validateMoreIdeasResponse(response, config = DEFAULT_VALIDATION_CONFIG) {
  const errors = [];
  
  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['Invalid response format'], count: 0, connectionWordCounts: [], avgConnectionLength: 0 };
  }
  
  if (!response.moreIdeas || !Array.isArray(response.moreIdeas)) {
    errors.push('Missing or invalid moreIdeas array');
    return { valid: false, errors, count: 0, connectionWordCounts: [], avgConnectionLength: 0 };
  }
  
  const { moreIdeas } = response;
  
  // Check count
  if (moreIdeas.length < config.minRecommendations || moreIdeas.length > config.maxRecommendations) {
    errors.push(`Should have ${config.minRecommendations}-${config.maxRecommendations} recommendations, got: ${moreIdeas.length}`);
  }
  
  // Check each recommendation
  moreIdeas.forEach((idea, index) => {
    if (!idea.title?.trim()) {
      errors.push(`Recommendation ${index + 1} missing title`);
    } else if (idea.title.length > config.maxTitleLength) {
      errors.push(`Recommendation ${index + 1} title too long (${idea.title.length} chars)`);
    }
    
    if (!idea.year || typeof idea.year !== 'number') {
      errors.push(`Recommendation ${index + 1} missing/invalid year`);
    } else if (idea.year < config.yearRange[0] || idea.year > config.yearRange[1]) {
      errors.push(`Recommendation ${index + 1} has invalid year: ${idea.year}`);
    }
    
    if (!idea.connection?.trim()) {
      errors.push(`Recommendation ${index + 1} missing connection`);
    } else {
      const wordCount = idea.connection.split(' ').length;
      const [minWords, maxWords] = config.connectionWordRange;
      if (wordCount < minWords || wordCount > maxWords) {
        errors.push(`Recommendation ${index + 1} connection should be ${minWords}-${maxWords} words, got: ${wordCount}`);
      }
    }
  });
  
  // Check for duplicates
  const titles = moreIdeas.map(idea => `${idea.title} (${idea.year})`);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size !== titles.length) {
    errors.push('Contains duplicate movie recommendations');
  }
  
  // Check connection variety (avoid repetitive language) - optimized
  const CONNECTION_WORD_REGEX = /\b\w{5,}\b/g; // Words 5+ chars
  const connectionText = moreIdeas.map(idea => idea.connection.toLowerCase()).join(' ');
  const significantWords = connectionText.match(CONNECTION_WORD_REGEX) || [];
  
  const wordCounts = {};
  significantWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  const overusedWords = Object.entries(wordCounts)
    .filter(([word, count]) => count > config.maxWordReuse)
    .map(([word]) => word);
    
  if (overusedWords.length > 0) {
    errors.push(`Overused connection words: ${overusedWords.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    count: moreIdeas.length,
    connectionWordCounts: moreIdeas.map(idea => idea.connection.split(' ').length),
    avgConnectionLength: moreIdeas.reduce((sum, idea) => 
      sum + idea.connection.split(' ').length, 0) / moreIdeas.length
  };
}

/**
 * Example usage and test data
 */
export const EXAMPLE_USAGE = {
  // Test with complex film
  complex: () => buildMoreIdeasPrompt("Fight Club (1999)"),
  
  // Test with classic film  
  classic: () => buildMoreIdeasPrompt("Citizen Kane (1941)"),
  
  // Test with genre film
  genre: () => buildMoreIdeasPrompt("Blade Runner (1982)")
};