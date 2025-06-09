/**
 * Contextual Prompt Variations
 * 
 * Different contexts require different lengths, structures, and specific guidance
 * while maintaining the core voice and content types.
 */

import { CORE_VOICE, CONTENT_TYPES, FORMATTING_HAIKU } from './core.js';

// Interactive Q&A responses (ask-claude.js)
export const ASK_CONTEXT = {
  purpose: "Interactive movie questions and recommendations",
  length: "Under 400 words",
  structure: `${FORMATTING_HAIKU}
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2  
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming`,
  max_tokens: 4000,
  temperature: 0.7
};

// Detailed movie page analysis (movie-analysis.js)
export const MOVIE_ANALYSIS_CONTEXT = {
  purpose: "Comprehensive movie page analysis",
  length: "400-600 words with extensive recommendations",
  structure: `${FORMATTING_HAIKU}
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.EXPLORE_MORE}: topic4
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming (up to 50 relevant movies)`,
  max_tokens: 4000,
  temperature: 0.7
};

// Person/actor focused analysis (person-analysis.js) - Same depth as movie analysis
export const PERSON_CONTEXT = {
  purpose: "Comprehensive person analysis - actor, director, or film person",
  length: "400-600 words with extensive recommendations", // Same as movie analysis
  structure: `${FORMATTING_HAIKU}
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.EXPLORE_MORE}: topic4
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming (up to 50 relevant movies)`,
  max_tokens: 4000, // Same as movie analysis
  temperature: 0.7  // Same as movie analysis
};

// Movie list/collection analysis (list-analysis.js)
export const LIST_CONTEXT = {
  purpose: "Curated movie list or collection overview",
  length: "150-250 words focusing on thematic connections",
  structure: `DESCRIPTION: [collection theme and significance]
MOVIES: featured_film|year|why_included|streaming
DESCRIPTION: [evolution or variation within theme]
MOVIES: another_featured_film|year|why_included|streaming
${CONTENT_TYPES.MORE_IDEAS}: related_film|year|connection_to_theme|streaming`,
  max_tokens: 2000,
  temperature: 0.3
};

// Educational list analysis (educational-list-analysis.js) - Same as ASK prompt
export const EDUCATIONAL_CONTEXT = {
  purpose: "Educational or film studies focused analysis with interactive depth",
  length: "250-400 words with comprehensive insights", // Same as ASK
  structure: `${FORMATTING_HAIKU}
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2  
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming`,
  max_tokens: 4000, // Same as ASK
  temperature: 0.7  // Same as ASK
};

// Future: Collection analysis (collection-analysis.js)
export const COLLECTION_CONTEXT = {
  purpose: "Multi-list collection with thematic connections",
  length: "300-500 words covering collection themes",
  structure: `DESCRIPTION: [overall collection significance]
PARAGRAPH: [connections between lists]
MOVIES: bridge_film|year|connects_themes|streaming
${CONTENT_TYPES.EXPLORE_MORE}: meta_theme1
${CONTENT_TYPES.EXPLORE_MORE}: meta_theme2
${CONTENT_TYPES.MORE_IDEAS}: collection_expansion|year|fits_because|streaming`,
  max_tokens: 3000,
  temperature: 0.5
};

// Context lookup for easy endpoint access
export const CONTEXTS = {
  ASK: ASK_CONTEXT,
  MOVIE_ANALYSIS: MOVIE_ANALYSIS_CONTEXT,
  PERSON: PERSON_CONTEXT,
  LIST: LIST_CONTEXT,
  EDUCATIONAL: EDUCATIONAL_CONTEXT,
  COLLECTION: COLLECTION_CONTEXT
};