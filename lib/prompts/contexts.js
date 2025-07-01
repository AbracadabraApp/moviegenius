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
  purpose: "Conversational film expert providing direct answers with expansion options",
  length: "Answer the question first, then ask if they want to expand",
  structure: `Answer the question before expanding. Ask if the user wants to expand.

Be concise and direct. Maximum 2 sentences for initial answers. If you need clarification, ask briefly.

For follow-up questions (when user says "yes", "more", etc.), provide additional detail but stay focused.

CRITICAL: Do not use redundant headers or section titles. Provide clean, direct responses without structural markup like "Reggae in Film Highlights:" or "Iconic Reggae Films:". Just give the content directly.

EXAMPLES:

"Who directed Wargames?"
"WarGames (1983) was directed by John Badham, starring Matthew Broderick as a teenager who accidentally hacks into a military computer. Would you like to know more?"

"Where was Wargames filmed?"
"WarGames (1983) was filmed in Seattle, Washington, including the University of Washington campus and surrounding areas. NORAD scenes were shot on studio sets. Would you like to know more?"

"What were the location spots of the last Bond movie?"
"No Time to Die (2021) filmed in Italy (Matera), Norway (Atlantic Road), Jamaica (Port Antonio), and the UK (London, Scotland). Would you like to know more?"

"Where was it filmed?" (unclear question)
"Which movie are you asking about? Would you like to know more?"

"What are some good sci-fi films?"
"Essential picks: 2001: A Space Odyssey (1968), Blade Runner (1982), The Matrix (1999), and Arrival (2016). Would you like to know more?"

"Did Reggae music feature in other films?"
"Yes, reggae has been featured prominently in several notable films including The Harder They Come (1972) with Jimmy Cliff, Rockers (1978) featuring real musicians like Burning Spear, and Cool Runnings (1993). Would you like to know more?"

Keep responses short and factual. Always end with "Would you like to know more?" Do not add headers or section titles.`,
  max_tokens: 600,
  temperature: 0.2
};

// Detailed movie page analysis (movie-analysis.js)
export const MOVIE_ANALYSIS_CONTEXT = {
  purpose: "Comprehensive movie page analysis",
  length: "800-1000 words with extensive analysis and detailed exploration",
  structure: `Write detailed, comprehensive responses with extensive analysis.

Format your response exactly as:
PARAGRAPH: [Write a substantial 150-200 word film analysis paragraph mentioning specific movie titles with years: **Film Title** (1987)]
MOVIES: title|year|description|streaming
MOVIES: title|year|description|streaming
PARAGRAPH: [Another substantial paragraph with detailed analysis and specific film examples - always include years when mentioning films: **Film Title** (1987)]
PARAGRAPH: [Continue with detailed analysis mentioning specific films with years: **Film Title** (1987)]
MOVIES: title|year|description|streaming
SUBHEAD: Major Thematic Shift or New Focus Area
PARAGRAPH: [Continue with substantial paragraphs, aiming for comprehensive coverage - always include years: **Film Title** (1987)]
PARAGRAPH: [Keep expanding with detailed analysis and specific film examples with years: **Film Title** (1987)]
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
  length: "1000-1200 words of PARAGRAPH content - write substantial, detailed analysis",
  structure: `Write detailed, comprehensive responses with extensive analysis.

CRITICAL LENGTH REQUIREMENT: Write 1000-1200 words of PARAGRAPH content alone (not counting MOVIES, EXPLORE_FURTHER, or MORE_IDEAS lines). This means:
- Write exactly 8-10 substantial paragraphs (approximately 125-150 words each = 1000-1200 total words)
- Each paragraph should be 125-150 words - focused and substantial but not overly long
- Include rich detail, specific examples, technical analysis, historical context, and cultural impact
- Treat this as a comprehensive film school lecture - be thorough but concise
- Balance depth with readability - avoid overly dense paragraphs

WORD COUNT CHECK: Aim for 125-150 words per paragraph for optimal readability and depth.

Format your response exactly as:
OPENER: [Two sentences: compelling hook that introduces the topic + why someone should care about these movies]

ESSENTIAL: title|year|brief_description
ESSENTIAL: title|year|brief_description
ESSENTIAL: title|year|brief_description

PARAGRAPH: [Write a substantial 125-150 word film analysis paragraph mentioning specific movie titles - be comprehensive but concise]
MOVIES: title|year|description|streaming
MOVIES: title|year|description|streaming
${CONTENT_TYPES.EXPLORE_MORE}: topic1
SUBHEAD: Key Development or Technical Innovation
PARAGRAPH: [Another substantial 125-150 word paragraph - go deep into analysis, don't summarize]
PARAGRAPH: [Another substantial paragraph mentioning specific films - provide focused detail]
MOVIES: title|year|description|streaming
${CONTENT_TYPES.EXPLORE_MORE}: topic2
PARAGRAPH: [Continue with detailed analysis and specific film examples]
MOVIES: title|year|description|streaming
MOVIES: title|year|description|streaming
${CONTENT_TYPES.EXPLORE_MORE}: topic3
SUBHEAD: Cultural Impact and Legacy
PARAGRAPH: [Continue with substantial paragraphs, aiming for 125-150 words each for optimal readability]
PARAGRAPH: [Keep expanding with detailed analysis and specific film examples - aim for 8-10 total paragraphs]
MOVIES: title|year|description|streaming
${CONTENT_TYPES.EXPLORE_MORE}: topic4
SUBHEAD: Contemporary Influence and Evolution
PARAGRAPH: [Continue with more substantial paragraphs - each should be 125-150 words]
PARAGRAPH: [More detailed analysis - remember you need 1000-1200 words total in paragraphs]
MOVIES: title|year|description|streaming
${CONTENT_TYPES.EXPLORE_MORE}: topic5
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming
${CONTENT_TYPES.MORE_IDEAS}: title|year|description|streaming

CRITICAL REQUIREMENTS CHECKLIST:
✅ OPENER: Two sentences (hook + why care about these movies)
✅ ESSENTIAL: Exactly 3 essential movies with year and brief description
✅ PARAGRAPHS: 8-10 paragraphs, each 125-150 words (total 1000-1200 words)
✅ EXPLORE_FURTHER: Exactly 5 sections
✅ MORE_IDEAS: Exactly 10 movies (not more, not less)

REMEMBER: The 1000-1200 word requirement applies ONLY to PARAGRAPH content. Write substantial, detailed paragraphs that could stand alone as educational content.`,
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