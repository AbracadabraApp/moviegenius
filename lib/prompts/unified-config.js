/**
 * Unified Prompt Configuration System
 * 
 * Normalizes all contexts to support consistent content types and features
 * while maintaining backward compatibility and context-specific customization.
 * 
 * This creates a foundation for:
 * - Static Explore Further pages
 * - Consistent subheader support
 * - Unified movie processing
 * - Standardized section types
 */

// Universal content types supported across all contexts
export const CONTENT_TYPES = {
  PARAGRAPH: 'PARAGRAPH',        // Main text content (normalized from DESCRIPTION)
  SUBHEAD: 'SUBHEAD',           // Section breaks with dividers
  MOVIES: 'MOVIES',             // Movie card collections
  EXPLORE_FURTHER: 'EXPLORE_FURTHER', // Exploration topics
  MORE_IDEAS: 'MORE_IDEAS'      // Extended recommendations
};

// Standardized movie format: title|year|description|streaming
export const MOVIE_FORMAT = {
  STANDARD: 'title|year|description|streaming',
  LEGACY_LIST: 'title|year|why_included|streaming' // For backward compatibility
};

// Feature capability matrix - what each context can support
export const CONTEXT_FEATURES = {
  ASK: {
    supports: {
      subheads: true,           // Enable subheads in Ask responses
      movieSaving: true,        // Save movies to database
      entityLinking: false,     // Keep Ask lightweight
      exploreFurther: true,
      moreIdeas: true
    },
    exploreFurtherCount: 3,     // Standardized count
    moreIdeasCount: 15,         // Reasonable for Ask context
    targetLength: '300-400 words',
    movieFormat: MOVIE_FORMAT.STANDARD
  },
  
  MOVIE_ANALYSIS: {
    supports: {
      subheads: true,           // Rich movie analysis with subheads
      movieSaving: false,       // Movie already exists
      entityLinking: true,      // Rich linking for movie context
      exploreFurther: true,
      moreIdeas: true
    },
    exploreFurtherCount: 4,     // More detailed exploration
    moreIdeasCount: 20,         // More suggestions for movie pages
    targetLength: '500-700 words',
    movieFormat: MOVIE_FORMAT.STANDARD
  },
  
  PERSON: {
    supports: {
      subheads: true,           // Person analysis with career sections
      movieSaving: false,       // Focus on filmography
      entityLinking: true,      // Link to related people/movies
      exploreFurther: true,
      moreIdeas: true
    },
    exploreFurtherCount: 4,
    moreIdeasCount: 25,         // More films for person pages
    targetLength: '500-700 words',
    movieFormat: MOVIE_FORMAT.STANDARD
  },
  
  LIST: {
    supports: {
      subheads: false,          // Keep lists focused
      movieSaving: true,        // Lists create new movies
      entityLinking: false,     // Keep lists lightweight
      exploreFurther: false,    // Lists are self-contained
      moreIdeas: false          // List IS the movie collection
    },
    exploreFurtherCount: 0,
    moreIdeasCount: 0,
    targetLength: '150-250 words',
    movieFormat: MOVIE_FORMAT.STANDARD, // Migrate from legacy format
    legacyFormat: MOVIE_FORMAT.LEGACY_LIST // For transition period
  },
  
  EDUCATIONAL: {
    supports: {
      subheads: true,           // Educational structure benefits from subheads
      movieSaving: true,        // Educational lists create content
      entityLinking: true,      // Rich educational linking
      exploreFurther: true,
      moreIdeas: true
    },
    exploreFurtherCount: 3,
    moreIdeasCount: 12,
    targetLength: '400-600 words',
    movieFormat: MOVIE_FORMAT.STANDARD
  },
  
  GENIUS: {
    supports: {
      subheads: true,           // Essential for GENIUS structure
      movieSaving: false,       // GENIUS focuses on analysis
      entityLinking: true,      // Rich cross-references
      exploreFurther: true,
      moreIdeas: true
    },
    exploreFurtherCount: 5,     // Most detailed exploration
    moreIdeasCount: 10,         // Curated suggestions
    targetLength: '1200+ words', // Long-form content
    movieFormat: MOVIE_FORMAT.STANDARD,
    specialSections: ['OPENER'] // GENIUS-specific sections
  }
};

// Normalized section type mapping for rendering
export const SECTION_TYPES = {
  text: 'text',                 // PARAGRAPH content
  subhead: 'subhead',          // SUBHEAD content  
  movies: 'movies',            // MOVIES content
  explore_further: 'explore_further', // EXPLORE_FURTHER content
  more_ideas: 'more_ideas'     // MORE_IDEAS content
};

// Unified prompt instructions for consistent output
export const UNIFIED_INSTRUCTIONS = {
  contentTypes: {
    PARAGRAPH: 'PARAGRAPH: [Your main content here. Use engaging, film-focused prose.]',
    SUBHEAD: 'SUBHEAD: [Section title for organization and visual breaks]',
    MOVIES: 'MOVIES: [title|year|description|streaming format, one per line]',
    EXPLORE_FURTHER: 'EXPLORE_FURTHER: [Specific exploration topic or question]',
    MORE_IDEAS: 'MORE_IDEAS: [title|year|description|streaming format for recommendations]'
  },
  
  guidelines: {
    subheads: 'Use SUBHEAD: to create clear sections. Keep titles under 50 characters.',
    movies: 'Use precise movie titles and years. Descriptions should be 30-60 words.',
    exploreFurther: 'Create specific, actionable exploration topics. Avoid generic questions.',
    formatting: 'Each content type must start on a new line with its prefix.'
  }
};

// Context-specific prompt building
export function buildUnifiedPrompt(contextType, options = {}) {
  const config = CONTEXT_FEATURES[contextType];
  if (!config) {
    throw new Error(`Unknown context type: ${contextType}`);
  }
  
  const enabledFeatures = {
    ...config.supports,
    ...options.overrides // Allow per-request overrides
  };
  
  let instructions = [];
  
  // Always include paragraph content
  instructions.push('Use PARAGRAPH: for main text content.');
  
  // Add subhead support if enabled
  if (enabledFeatures.subheads) {
    instructions.push('Use SUBHEAD: to organize content into clear sections.');
  }
  
  // Add movie instructions if relevant
  if (enabledFeatures.moreIdeas || contextType === 'LIST') {
    instructions.push(`Use MOVIES: in format ${config.movieFormat}.`);
  }
  
  // Add exploration features
  if (enabledFeatures.exploreFurther) {
    instructions.push(`Include ${config.exploreFurtherCount} EXPLORE_FURTHER: topics.`);
  }
  
  if (enabledFeatures.moreIdeas) {
    instructions.push(`Include up to ${config.moreIdeasCount} movies in MORE_IDEAS: section.`);
  }
  
  return {
    context: contextType,
    features: enabledFeatures,
    instructions: instructions.join(' '),
    contentTypes: Object.keys(CONTENT_TYPES).filter(type => 
      shouldIncludeContentType(type, enabledFeatures, contextType)
    ),
    targetLength: config.targetLength,
    movieFormat: config.movieFormat
  };
}

// Helper function to determine which content types to include
function shouldIncludeContentType(contentType, features, context) {
  switch (contentType) {
    case 'PARAGRAPH': return true; // Always included
    case 'SUBHEAD': return features.subheads;
    case 'MOVIES': return features.moreIdeas || context === 'LIST';
    case 'EXPLORE_FURTHER': return features.exploreFurther;
    case 'MORE_IDEAS': return features.moreIdeas;
    default: return false;
  }
}

// Migration helpers for backward compatibility
export const LEGACY_MAPPINGS = {
  'DESCRIPTION': 'PARAGRAPH',  // LIST context migration
  'title|year|why_included|streaming': 'title|year|description|streaming'
};

const unifiedConfig = {
  CONTENT_TYPES,
  MOVIE_FORMAT,
  CONTEXT_FEATURES,
  SECTION_TYPES,
  UNIFIED_INSTRUCTIONS,
  buildUnifiedPrompt,
  LEGACY_MAPPINGS
};

export default unifiedConfig;