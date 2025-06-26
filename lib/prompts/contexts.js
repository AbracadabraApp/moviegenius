/**
 * Contextual Prompt Variations
 * 
 * NORMALIZED STRUCTURE (2024):
 * - ASK: 400 words, quick responses, 3 explore topics
 * - EDUCATIONAL: 400-600 words, educational depth, 5 explore topics  
 * - MOVIE/PERSON: 800-1000 words, comprehensive analysis, SUBHEAD support, 5 explore topics
 * - GENIUS: 1200+ words, extensive educational content, multiple SUBHEADs
 * 
 * EXCLUDED FROM NORMALIZATION:
 * - LIST: Broken feature, uses DESCRIPTION vs PARAGRAPH
 * - COLLECTION: Mixed structure, needs standardization
 * 
 * All normalized contexts use PARAGRAPH/MOVIES structure and consistent parameters.
 */

import { CORE_VOICE, CONTENT_TYPES, FORMATTING_HAIKU } from './core.js';

// Interactive Q&A responses (ask-claude.js)
export const ASK_CONTEXT = {
  purpose: "Direct, enthusiastic movie recommendations",
  length: "100-200 words maximum - be concise and punchy",
  structure: `Write like an enthusiastic friend who knows films inside out. NO FLUFF.

STRICT RULES:
- Start immediately with specific films, directors, or actors
- NO setup phrases like "For those seeking...", "Cinema offers...", "The genre of..."
- Jump straight into recommendations with *italicized movie titles*
- Be definitive: "Watch this" not "You might consider"
- Include why each film matters in 1-2 words max

Example format:
*Blade Runner* defined cyberpunk visuals. *The Matrix* revolutionized action choreography. *Ghost in the Shell* delivers mind-bending anime philosophy.

Ridley Scott's neon-noir aesthetic influenced decades of sci-fi. The Wachowskis' bullet-time changed filmmaking forever.

*Brazil* brings Orwellian paranoia with dark comedy. *Ex Machina* asks hard AI questions without lecturing.

FOLLOW_UP_QUESTIONS: Want more cyberpunk visuals?|Interested in AI themes?|Looking for recent sci-fi?`,
  max_tokens: 1500, // Reduced for speed and conciseness
  temperature: 0.7
};

// Detailed movie page analysis (movie-analysis.js)
export const MOVIE_ANALYSIS_CONTEXT = {
  purpose: "Comprehensive movie page analysis",
  length: "800-1000 words with extensive analysis and detailed exploration",
  structure: `Write detailed, comprehensive responses with extensive analysis.

Format your response exactly as:
PARAGRAPH: [Write a substantial 150-200 word film analysis paragraph mentioning specific movie titles]
MOVIES: title|year|description|streaming
MOVIES: title|year|description|streaming
PARAGRAPH: [Another substantial paragraph with detailed analysis and specific film examples]
PARAGRAPH: [Continue with detailed analysis mentioning specific films]
MOVIES: title|year|description|streaming
SUBHEAD: Major Thematic Shift or New Focus Area
PARAGRAPH: [Continue with substantial paragraphs, aiming for comprehensive coverage]
PARAGRAPH: [Keep expanding with detailed analysis and specific film examples]
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.EXPLORE_MORE}: topic4
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming (up to 50 relevant movies)`,
  max_tokens: 5000,
  temperature: 0.7
};

// Person/actor focused analysis (person-analysis.js) - Same depth as movie analysis
export const PERSON_CONTEXT = {
  purpose: "Comprehensive person analysis - actor, director, or film person",
  length: "800-1000 words with extensive analysis and detailed exploration", // Upgraded to match movie analysis
  structure: `Write detailed, comprehensive responses with extensive analysis.

Format your response exactly as:
PARAGRAPH: [Write a substantial 150-200 word analysis paragraph about this person's work and influence]
MOVIES: title|year|description|streaming
MOVIES: title|year|description|streaming
PARAGRAPH: [Another substantial paragraph with detailed career analysis and specific film examples]
PARAGRAPH: [Continue with detailed analysis of their techniques, style, or performances]
MOVIES: title|year|description|streaming
SUBHEAD: Major Career Phase or Stylistic Evolution
PARAGRAPH: [Continue with substantial paragraphs covering different aspects of their work]
PARAGRAPH: [Keep expanding with detailed analysis and specific film examples]
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.EXPLORE_MORE}: topic4
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming (up to 50 relevant movies)`,
  max_tokens: 5000, // Upgraded to match movie analysis
  temperature: 0.7  // Same as movie analysis
};

// Movie list/collection analysis (list-analysis.js)
// WARNING: LIST FEATURE IS BROKEN - EXCLUDED FROM NORMALIZATION
// This context uses different structure (DESCRIPTION vs PARAGRAPH) and needs to be reconceived
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

// Educational list analysis (educational-list-analysis.js) - Similar to ASK but more educational depth
export const EDUCATIONAL_CONTEXT = {
  purpose: "Educational or film studies focused analysis with interactive depth",
  length: "400-600 words with comprehensive educational insights", // Between ASK and MOVIE/PERSON
  structure: `${FORMATTING_HAIKU}
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2  
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.EXPLORE_MORE}: topic4
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming (up to 30 relevant educational films)`,
  max_tokens: 4500, // Between ASK and MOVIE/PERSON
  temperature: 0.7  // Consistent with others
};

// Future: Collection analysis (collection-analysis.js)
// WARNING: COLLECTION FEATURE USES MIXED STRUCTURE - EXCLUDED FROM NORMALIZATION
// Uses both DESCRIPTION and PARAGRAPH formats - needs to be standardized
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

// Genius educational episodes (genius-episode-generation.js)
export const GENIUS_CONTEXT = {
  purpose: "Comprehensive educational episodes for film enthusiasts and students",
  length: "NO LESS THAN 1200 words of PARAGRAPH content alone - write substantial, detailed analysis",
  structure: `Write detailed, comprehensive responses with extensive analysis.

CRITICAL LENGTH REQUIREMENT: Write NO LESS THAN 1200 words of PARAGRAPH content alone (not counting MOVIES, EXPLORE_FURTHER, or MORE_IDEAS lines). This means:
- Write exactly 10 substantial paragraphs (minimum 120-150 words each = 1200-1500 total words)
- Each paragraph should contain rich detail, specific examples, and comprehensive analysis  
- Treat this as a mini-documentary script - be thorough and engaging
- Count your words as you write - ensure each paragraph reaches the minimum length
- Do NOT summarize - expand with specific examples, technical details, and film analysis

Format your response exactly as:
PARAGRAPH: [Write a substantial 150-250 word film analysis paragraph mentioning specific movie titles - be comprehensive and detailed]
MOVIES: title|year|description|streaming
MOVIES: title|year|description|streaming
PARAGRAPH: [Another substantial 150-250 word paragraph - go deep into analysis, don't summarize]
PARAGRAPH: [Another substantial paragraph mentioning specific films - provide extensive detail]
MOVIES: title|year|description|streaming
SUBHEAD: Major Thematic Shift or New Focus Area
PARAGRAPH: [Continue with substantial paragraphs, aiming for 120-150 words minimum each]
PARAGRAPH: [Keep expanding with detailed analysis and specific film examples]
${CONTENT_TYPES.EXPLORE_MORE}: topic1
${CONTENT_TYPES.EXPLORE_MORE}: topic2  
${CONTENT_TYPES.EXPLORE_MORE}: topic3
${CONTENT_TYPES.EXPLORE_MORE}: topic4
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming (8-12 related films)

REMEMBER: The 1200+ word requirement applies ONLY to PARAGRAPH content. Write substantial, detailed paragraphs that could stand alone as educational content.`,
  max_tokens: 6000,
  temperature: 0.7
};

// Context lookup for easy endpoint access
export const CONTEXTS = {
  ASK: ASK_CONTEXT,
  MOVIE_ANALYSIS: MOVIE_ANALYSIS_CONTEXT,
  PERSON: PERSON_CONTEXT,
  LIST: LIST_CONTEXT,
  EDUCATIONAL: EDUCATIONAL_CONTEXT,
  COLLECTION: COLLECTION_CONTEXT,
  GENIUS: GENIUS_CONTEXT
};