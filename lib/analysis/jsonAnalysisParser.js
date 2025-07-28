// lib/analysis/jsonAnalysisParser.js
/**
 * JSON Analysis Parser - Clean parsing logic for new JSON-based movie analysis
 * 
 * This replaces the text-based parsing with structured JSON processing
 * for the new MOVIE_ANALYSIS_CONTEXT prompt format.
 */

/**
 * Detect the format of analysis content
 * @param {string|object} analysis - The analysis content to check
 * @returns {string} - 'json', 'text', or 'unknown'
 */
export const detectAnalysisFormat = (analysis) => {
  if (typeof analysis === 'object' && analysis !== null) {
    return analysis.metadata ? 'json' : 'unknown';
  }
  
  if (typeof analysis === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(analysis);
      return parsed.metadata ? 'json' : 'text';
    } catch (e) {
      // Check for legacy text format patterns
      if (analysis.includes('PARAGRAPH:') || analysis.includes('MOVIES:')) {
        return 'text';
      }
      return 'unknown';
    }
  }
  
  return 'unknown';
};

/**
 * Validate JSON analysis structure
 * @param {object} jsonData - Parsed JSON analysis data
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export const validateJSONAnalysis = (jsonData) => {
  const errors = [];
  const requiredFields = [
    'metadata',
    'keyElements',
    'whyWatch',
    'content',
    'featuredMovies',
    'exploreTopics',
    'moreIdeas'
  ];
  
  // Check required top-level fields
  requiredFields.forEach(field => {
    if (!jsonData.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate metadata structure
  if (jsonData.metadata) {
    const metadataRequired = ['title', 'year', 'analysisType', 'wordCount'];
    metadataRequired.forEach(field => {
      if (!jsonData.metadata.hasOwnProperty(field)) {
        errors.push(`Missing metadata field: ${field}`);
      }
    });
    
    // Validate word count is within range
    const wordCount = jsonData.metadata.wordCount;
    if (wordCount && (wordCount < 700 || wordCount > 1100)) {
      errors.push(`Word count ${wordCount} outside expected range (700-1100)`);
    }
  }
  
  // Validate content structure
  if (jsonData.content && Array.isArray(jsonData.content)) {
    const expectedTypes = [
      'introduction',
      'technicalAnalysis', 
      'culturalContext',
      'thematicExploration',
      'legacyAndImpact',
      'contemporaryRelevance',
      'conclusion'
    ];
    
    const actualTypes = jsonData.content.map(section => section.type);
    expectedTypes.forEach(type => {
      if (!actualTypes.includes(type)) {
        errors.push(`Missing content section: ${type}`);
      }
    });
  }
  
  // Validate arrays have minimum items
  if (jsonData.whyWatch && jsonData.whyWatch.length < 3) {
    errors.push('whyWatch should have at least 3 reasons');
  }
  
  if (jsonData.featuredMovies && jsonData.featuredMovies.length < 3) {
    errors.push('featuredMovies should have at least 3 movies'); 
  }
  
  if (jsonData.exploreTopics && jsonData.exploreTopics.length < 4) {
    errors.push('exploreTopics should have at least 4 topics');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Parse JSON analysis into component-ready format
 * @param {string|object} analysisData - JSON analysis data
 * @returns {object} - Parsed analysis ready for component consumption
 */
export const parseJSONAnalysis = (analysisData) => {
  const parseStart = performance.now();
  
  // Handle string input (parse JSON)
  let jsonData;
  if (typeof analysisData === 'string') {
    try {
      jsonData = JSON.parse(analysisData);
    } catch (e) {
      throw new Error(`Invalid JSON analysis format: ${e.message}`);
    }
  } else {
    jsonData = analysisData;
  }
  
  // Validate structure
  const validation = validateJSONAnalysis(jsonData);
  if (!validation.isValid) {
    console.warn('JSON analysis validation warnings:', validation.errors);
  }
  
  // Extract content sections as text blocks
  const textSections = (jsonData.content || []).map(section => ({
    type: section.type,
    text: section.text.replace(/\\n\\n/g, '\n\n'), // Convert escaped newlines
    wordCount: section.text.split(' ').length
  }));
  
  // Process featured movies with proper structure
  const featuredMovies = (jsonData.featuredMovies || []).map(movie => ({
    title: movie.title,
    year: movie.year,
    description: movie.description,
    slug: `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`,
    // Default placeholders for missing data
    poster_url: movie.poster_url || null,
    streaming: movie.streaming || null,
    tmdb_id: movie.tmdb_id || null
  }));
  
  // Process explore topics
  const exploreTopics = (jsonData.exploreTopics || []).map(topic => ({
    topic: topic.topic,
    category: topic.category,
    difficulty: topic.difficulty
  }));
  
  // Process more ideas
  const moreIdeas = (jsonData.moreIdeas || []).map(idea => ({
    title: idea.title,
    year: idea.year,
    connection: idea.connection,
    slug: `${idea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idea.year}`,
    // Default placeholders
    poster_url: idea.poster_url || null,
    streaming: idea.streaming || null,
    tmdb_id: idea.tmdb_id || null
  }));
  
  // Build alternating layout structure
  const layout = buildAlternatingLayout(textSections, featuredMovies, exploreTopics);
  
  const parseEnd = performance.now();
  const processingTime = parseEnd - parseStart;
  
  return {
    // Core data
    metadata: jsonData.metadata,
    keyElements: jsonData.keyElements,
    whyWatch: jsonData.whyWatch,
    
    // Processed sections
    textSections,
    featuredMovies,
    exploreTopics, 
    moreIdeas,
    
    // Layout for component rendering
    layout,
    
    // Processing metadata
    format: 'json',
    isJsonFormat: true,
    processingTime,
    processedAt: new Date().toISOString(),
    
    // Entity stats for monitoring
    entityStats: {
      totalEntities: featuredMovies.length + moreIdeas.length,
      movies: featuredMovies.length + moreIdeas.length,
      people: (jsonData.linkedReferences || []).filter(ref => ref.type === 'person').length,
      totalSections: textSections.length,
      totalWordCount: textSections.reduce((sum, section) => sum + section.wordCount, 0)
    }
  };
};

/**
 * Build alternating layout for component rendering
 * Pattern: text -> movies -> text -> movies -> explore topics -> etc.
 */
export const buildAlternatingLayout = (textSections, featuredMovies, exploreTopics) => {
  const layout = [];
  
  // Add intro sections with featured movies interspersed
  textSections.forEach((section, index) => {
    layout.push({
      type: 'text',
      content: section,
      id: `text-${index}`
    });
    
    // Add featured movies at strategic points
    if (index === 1 && featuredMovies.length >= 2) {
      layout.push({
        type: 'featured-movies',
        content: featuredMovies.slice(0, 2),
        id: 'featured-movies-1'
      });
    } else if (index === 3 && featuredMovies.length >= 4) {
      layout.push({
        type: 'featured-movies', 
        content: featuredMovies.slice(2, 4),
        id: 'featured-movies-2'
      });
    }
    
    // Add explore topics at the end
    if (index === textSections.length - 1) {
      layout.push({
        type: 'explore-topics',
        content: exploreTopics,
        id: 'explore-topics'
      });
    }
  });
  
  return layout;
};

/**
 * Legacy text analysis parser for backward compatibility
 * @param {string} textContent - Legacy PARAGRAPH:/MOVIES: format
 * @returns {object} - Parsed analysis in unified format
 */
export const parseTextAnalysis = (textContent) => {
  // This maintains compatibility with existing text parsing
  // Implementation would go here for legacy support
  return {
    format: 'text',
    isJsonFormat: false,
    // ... legacy parsing logic
  };
};

/**
 * Universal analysis parser - handles both JSON and text formats
 * @param {string|object} analysisData - Analysis in any supported format
 * @returns {object} - Unified parsed analysis
 */
export const parseAnalysis = (analysisData) => {
  const format = detectAnalysisFormat(analysisData);
  
  switch (format) {
    case 'json':
      return parseJSONAnalysis(analysisData);
    case 'text':
      return parseTextAnalysis(analysisData);
    default:
      throw new Error(`Unsupported analysis format: ${format}`);
  }
};