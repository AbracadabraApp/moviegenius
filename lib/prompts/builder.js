/**
 * Prompt Builder - Combines Core + Context
 * 
 * Builds complete prompts by combining standardized core elements
 * with contextual variations, ensuring consistency and caching.
 */

import { CORE_VOICE, CACHE_CONFIG, STANDARD_PARAMS } from './core.js';
import { CONTEXTS } from './contexts.js';

/**
 * Build a complete prompt for a specific context
 * @param {string} contextName - Context key from CONTEXTS
 * @param {string} customGuidance - Optional context-specific guidance
 * @returns {object} Complete prompt configuration
 */
export function buildPrompt(contextName, customGuidance = '') {
  const context = CONTEXTS[contextName];
  
  if (!context) {
    throw new Error(`Unknown context: ${contextName}. Available: ${Object.keys(CONTEXTS).join(', ')}`);
  }
  
  // Combine core voice with contextual requirements
  const systemPrompt = `${CORE_VOICE}

Purpose: ${context.purpose}
Length: ${context.length}
${customGuidance ? `Additional guidance: ${customGuidance}` : ''}

${context.structure}`;

  // Return complete Claude API configuration
  return {
    ...STANDARD_PARAMS,
    max_tokens: context.max_tokens,
    temperature: context.temperature,
    system: [
      {
        type: "text",
        text: systemPrompt,
        ...CACHE_CONFIG // Enable caching for cost savings
      }
    ]
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
  
  return `${CORE_VOICE}

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