/**
 * Predictive Cache for Ask Responses
 *
 * Pre-generates responses for common questions to achieve instant responses.
 * Uses background processing to warm cache with popular queries.
 */

import { getCache } from './cache.js';

// Common film questions that can be pre-cached
const COMMON_QUESTIONS = [
  'What are the best sci-fi movies?',
  'Recommend some thriller films',
  'Best movies of all time',
  'Good horror movies to watch',
  'Classic film noir recommendations',
  'Best foreign films',
  'Oscar-winning movies',
  'Movies like Blade Runner',
  'Alfred Hitchcock films',
  'Studio Ghibli movies',
  'Best action movies',
  'Romantic comedies',
  'Documentary recommendations',
  'Movies for beginners',
  'Underrated gems',
];

// Question patterns for dynamic caching
const QUESTION_PATTERNS = [
  /movies like (.+)/i,
  /best (.+) films/i,
  /(.+) recommendations/i,
  /films by (.+)/i,
  /(.+) genre movies/i,
];

/**
 * Predictive Cache Manager
 */
class PredictiveCacheManager {
  constructor() {
    this.cache = getCache();
    this.isWarming = false;
    this.warmingProgress = 0;
  }

  /**
   * Check if a question has a predictive cache hit
   * @param {string} question - User's question
   * @returns {Promise<Object|null>} - Cached response or null
   */
  async getPredictiveResponse(question) {
    const normalizedQuestion = this.normalizeQuestion(question);

    // Check exact match first
    const exactMatch = await this.cache.get(`predictive:${normalizedQuestion}`);
    if (exactMatch) {
      // Predictive cache HIT
      return exactMatch;
    }

    // Check pattern matches
    for (const pattern of QUESTION_PATTERNS) {
      const match = question.match(pattern);
      if (match) {
        const patternKey = `pattern:${pattern.toString()}:${match[1].toLowerCase()}`;
        const patternMatch = await this.cache.get(patternKey);
        if (patternMatch) {
          // Pattern cache HIT
          return patternMatch;
        }
      }
    }

    return null;
  }

  /**
   * Cache a response for future predictive use
   * @param {string} question - Original question
   * @param {Object} response - Claude response
   */
  async cachePredictiveResponse(question, response) {
    const normalizedQuestion = this.normalizeQuestion(question);

    // Cache with 7-day TTL for stability
    await this.cache.set(
      `predictive:${normalizedQuestion}`,
      response,
      7 * 24 * 60 * 60 // 7 days
    );

    // Also cache by patterns if applicable
    for (const pattern of QUESTION_PATTERNS) {
      const match = question.match(pattern);
      if (match) {
        const patternKey = `pattern:${pattern.toString()}:${match[1].toLowerCase()}`;
        await this.cache.set(patternKey, response, 7 * 24 * 60 * 60);
      }
    }
  }

  /**
   * Warm cache with common questions (background process)
   */
  async warmPredictiveCache() {
    if (this.isWarming) {
      // Predictive cache warming already in progress
      return;
    }

    this.isWarming = true;
    this.warmingProgress = 0;
    // Starting predictive cache warming

    try {
      for (let i = 0; i < COMMON_QUESTIONS.length; i++) {
        const question = COMMON_QUESTIONS[i];
        const normalizedQuestion = this.normalizeQuestion(question);

        // Skip if already cached
        const existing = await this.cache.get(`predictive:${normalizedQuestion}`);
        if (existing) {
          this.warmingProgress = ((i + 1) / COMMON_QUESTIONS.length) * 100;
          continue;
        }

        // Generate response for caching
        try {
          const { generateClaudeResponse } = await import('../pages/api/ask-claude.js');
          const response = await generateClaudeResponse(question);
          await this.cachePredictiveResponse(question, response);

          // Cached predictive response

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`⚠️ Failed to cache response for: "${question}"`, error.message);
        }

        this.warmingProgress = ((i + 1) / COMMON_QUESTIONS.length) * 100;
      }

      // Predictive cache warming completed
    } catch (error) {
      console.error('❌ Predictive cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Get cache warming status
   */
  getWarmingStatus() {
    return {
      isWarming: this.isWarming,
      progress: this.warmingProgress,
      commonQuestionsCached: COMMON_QUESTIONS.length,
    };
  }

  /**
   * Normalize question for consistent caching
   * @param {string} question - Raw question
   * @returns {string} - Normalized question
   */
  normalizeQuestion(question) {
    return question
      .toLowerCase()
      .trim()
      .replace(/[?.!,]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Analyze user questions to identify new caching opportunities
   * @param {string} question - User's question
   */
  async analyzeForCaching(question) {
    const normalizedQuestion = this.normalizeQuestion(question);

    // Track question frequency
    const frequencyKey = `question_frequency:${normalizedQuestion}`;
    const currentCount = (await this.cache.get(frequencyKey)) || 0;
    const newCount = currentCount + 1;

    await this.cache.set(frequencyKey, newCount, 30 * 24 * 60 * 60); // 30 days

    // If question is asked frequently, consider adding to common questions
    if (newCount >= 3) {
      // Popular question detected
      // Could trigger background caching for this question
    }
  }
}

// Singleton instance
let predictiveCacheManager = null;

export function getPredictiveCacheManager() {
  if (!predictiveCacheManager) {
    predictiveCacheManager = new PredictiveCacheManager();
  }
  return predictiveCacheManager;
}

/**
 * Middleware to check predictive cache before API call
 */
export async function checkPredictiveCache(question) {
  const manager = getPredictiveCacheManager();

  // Analyze for future caching opportunities
  await manager.analyzeForCaching(question);

  // Return cached response if available
  return await manager.getPredictiveResponse(question);
}

/**
 * Background process to warm predictive cache
 * Call this on server startup or during low-traffic periods
 */
export async function startPredictiveCacheWarming() {
  const manager = getPredictiveCacheManager();

  // Run in background
  setTimeout(async () => {
    await manager.warmPredictiveCache();
  }, 5000); // Start after 5 seconds
}
