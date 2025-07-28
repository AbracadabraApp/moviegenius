/**
 * Prompt Builder - Combines Core + Context
 *
 * Builds complete prompts by combining standardized core elements
 * with contextual variations, ensuring consistency and caching.
 */

import { CORE_VOICE, CORE_VOICE_JSON, CACHE_CONFIG, STANDARD_PARAMS, selectOptimalModel } from './core.js';
import { CONTEXTS } from './contexts.js';

/**
 * Build a complete prompt for a specific context with speed optimization
 * @param {string} contextName - Context key from CONTEXTS
 * @param {string} customGuidance - Optional context-specific guidance
 * @param {boolean} isFirstResponse - Whether this is a first response (uses fastest model for engagement)
 * @returns {object} Complete prompt configuration
 */
export function buildPrompt(contextName, customGuidance = '', isFirstResponse = true) {
  const context = CONTEXTS[contextName];

  if (!context) {
    throw new Error(
      `Unknown context: ${contextName}. Available: ${Object.keys(CONTEXTS).join(', ')}`
    );
  }

  // Select appropriate core voice based on context
  const coreVoice = contextName === 'MOVIE_ANALYSIS' ? CORE_VOICE_JSON : CORE_VOICE;
  
  // DEBUG: Log voice selection for diagnosis
  console.log(`🔍 PROMPT DEBUG: Context "${contextName}" using voice: ${contextName === 'MOVIE_ANALYSIS' ? 'CORE_VOICE_JSON' : 'CORE_VOICE'}`);
  
  // Combine core voice with contextual requirements
  const systemPrompt = `${coreVoice}

Purpose: ${context.purpose}
Length: ${context.length}
${customGuidance ? `Additional guidance: ${customGuidance}` : ''}

${context.structure}`;

  // Select optimal model for speed/quality balance
  const optimizedModel = selectOptimalModel(contextName, isFirstResponse);

  // Return complete Claude API configuration with speed optimization
  return {
    ...STANDARD_PARAMS,
    model: optimizedModel, // Override with speed-optimized model
    max_tokens: context.max_tokens,
    temperature: context.temperature,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        ...CACHE_CONFIG, // Enable caching for cost savings
      },
    ],
  };
}

/**
 * Get just the system prompt text (for debugging/validation)
 * @param {string} contextName - Context key from CONTEXTS
 * @param {string} customGuidance - Optional context-specific guidance
 * @returns {string} System prompt text
 */
export function getSystemPrompt(contextName, customGuidance = '') {
  const context = CONTEXTS[contextName];

  if (!context) {
    throw new Error(`Unknown context: ${contextName}`);
  }

  // Select appropriate core voice based on context
  const coreVoice = contextName === 'MOVIE_ANALYSIS' ? CORE_VOICE_JSON : CORE_VOICE;
  
  return `${coreVoice}

Purpose: ${context.purpose}
Length: ${context.length}
${customGuidance ? `Additional guidance: ${customGuidance}` : ''}

${context.structure}`;
}

/**
 * Validate that a context exists and return its config
 * @param {string} contextName - Context to validate
 * @returns {object} Context configuration
 */
export function validateContext(contextName) {
  const context = CONTEXTS[contextName];

  if (!context) {
    const available = Object.keys(CONTEXTS).join(', ');
    throw new Error(`Invalid context "${contextName}". Available contexts: ${available}`);
  }

  return context;
}

// Export available context names for easy reference
export const AVAILABLE_CONTEXTS = Object.keys(CONTEXTS);
