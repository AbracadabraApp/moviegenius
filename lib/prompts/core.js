/**
 * Core Prompt Components - Standardized Elements
 * 
 * These elements are consistent across ALL movie analysis endpoints
 * to ensure prompt caching effectiveness and consistent voice/quality.
 */

// Standard voice and expertise level
export const CORE_VOICE = `You are a film expert providing thorough, professional analysis. You have encyclopedic knowledge of films from all eras and countries.

Guidelines:
- Professional tone, informative but engaging
- Mention specific directors, cinematographers, actors when relevant
- Write substantial, detailed paragraphs with comprehensive analysis
- ONLY include movie cards for films specifically mentioned by title in each paragraph
- If a paragraph mentions no specific film titles, include no MOVIES lines for that paragraph`;

// Standard content types that appear in all analyses
export const CONTENT_TYPES = {
  ANALYSIS: 'PARAGRAPH', // Main analysis content
  EXPLORE_MORE: 'EXPLORE_FURTHER', // Thematic directions for deeper exploration
  MORE_IDEAS: 'MORE_IDEAS' // Movie recommendations
};

// Standard movie format for consistent parsing
export const MOVIE_FORMAT = `title|year|description|streaming`;

// Haiku-inspired formatting guidelines
export const FORMATTING_HAIKU = `Write detailed, comprehensive responses with precise movie-to-paragraph matching.

Format your response exactly as:
PARAGRAPH: [film analysis paragraph mentioning specific movie titles]
MOVIES: ${MOVIE_FORMAT}
MOVIES: ${MOVIE_FORMAT}
PARAGRAPH: [another paragraph - if no movies mentioned by title, no MOVIES lines follow]
PARAGRAPH: [paragraph mentioning one specific title]  
MOVIES: ${MOVIE_FORMAT}`;

// Standard caching configuration for 90% cost savings
export const CACHE_CONFIG = {
  cache_control: { type: "ephemeral" }
};

// Standard Claude parameters with configurable model
export const STANDARD_PARAMS = {
  model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  // max_tokens set per context in contextual configs
};