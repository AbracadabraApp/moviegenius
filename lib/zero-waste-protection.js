/**
 * Zero-Waste Content Protection System
 * 
 * CRITICAL: This module protects against content regeneration waste and data integrity loss.
 * Every function here must be bulletproof and fast - this is the core of our protection.
 */

/**
 * Detect if content already has movie links (Tier 1 - Complete)
 * 
 * CRITICAL: This function determines whether content is "complete" and should NEVER be touched.
 * Any content with existing movie links is considered complete regardless of other factors.
 * 
 * @param {string} content - Content to check for existing links
 * @returns {boolean} - True if content has any movie links
 */
export function hasLinks(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Check for the specific movie link pattern we use
  const hasMovieLinks = content.includes('<a href="/movie/') && content.includes('class="movie-title"');
  
  // Double-check with regex for bulletproof detection
  const movieLinkPattern = /<a\s+href="\/movie\/\d+"\s+class="movie-title"/;
  const hasValidPattern = movieLinkPattern.test(content);

  return hasMovieLinks && hasValidPattern;
}

/**
 * Classify content tier for zero-waste processing
 * 
 * @param {Object} analysisData - Movie analysis data from database
 * @returns {string} - 'complete', 'unlinked', or 'missing'
 */
export function classifyContentTier(analysisData) {
  // Tier 3: Missing - no analysis data
  if (!analysisData || !analysisData.claude_response || !analysisData.claude_response.raw_content) {
    return 'missing';
  }

  // Tier 1: Complete - has existing links
  if (hasLinks(analysisData.claude_response.raw_content)) {
    return 'complete';
  }

  // Tier 2: Unlinked - has analysis but no links
  return 'unlinked';
}

/**
 * Check if nuclear static file has links
 * 
 * @param {Object} staticData - Nuclear static page data
 * @returns {boolean} - True if any section has movie links
 */
export function staticPageHasLinks(staticData) {
  if (!staticData || !staticData.props || !staticData.props.sections) {
    return false;
  }

  // Check all text sections for existing links
  for (const section of staticData.props.sections) {
    if (section.type === 'text' && section.content) {
      if (hasLinks(section.content)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if episode content has links
 * 
 * @param {Object} episodeData - Episode data structure
 * @returns {boolean} - True if any part has movie links
 */
export function episodeHasLinks(episodeData) {
  if (!episodeData || !episodeData.content) {
    return false;
  }

  // Check opener
  if (episodeData.content.opener && hasLinks(episodeData.content.opener)) {
    return true;
  }

  // Check sections
  if (episodeData.content.sections) {
    for (const section of episodeData.content.sections) {
      if (section.type === 'text' && section.content && hasLinks(section.content)) {
        return true;
      }
    }
  }

  // Check moreIdeas content
  if (episodeData.content.moreIdeas?.content && hasLinks(episodeData.content.moreIdeas.content)) {
    return true;
  }

  return false;
}

/**
 * Get completion status for a movie from database (ENHANCED with database flags)
 * 
 * @param {Object} supabase - Supabase client
 * @param {number} movieId - Movie ID
 * @returns {Promise<Object>} - { tier, hasAnalysis, hasLinks, analysis }
 */
export async function getMovieCompletionStatus(supabase, movieId) {
  try {
    // Use enhanced database status check with completion flags
    const { getEnhancedMovieCompletionStatus } = await import('./zero-waste-database.js');
    const status = await getEnhancedMovieCompletionStatus(movieId);
    
    // If database tracking is available, trust it first
    if (status.databaseFlags && status.databaseFlags.hasLinkedAnalysis) {
      return {
        tier: 'complete',
        hasAnalysis: true,
        hasLinks: true,
        analysis: status.analysis,
        databaseTracked: true
      };
    }
    
    // Fallback to content analysis if database tracking isn't available
    if (status.analysis) {
      const tier = classifyContentTier({ claude_response: status.analysis });
      return {
        tier,
        hasAnalysis: true,
        hasLinks: tier === 'complete',
        analysis: status.analysis,
        databaseTracked: false
      };
    }
    
    return {
      tier: 'missing',
      hasAnalysis: false,
      hasLinks: false,
      analysis: null,
      databaseTracked: false
    };
  } catch (error) {
    console.error(`Error checking completion status for movie ${movieId}:`, error);
    return {
      tier: 'missing',
      hasAnalysis: false,
      hasLinks: false,
      analysis: null,
      databaseTracked: false
    };
  }
}

/**
 * Safe movie processing with three-tier protection
 * 
 * This is the core function that prevents content waste by implementing
 * the three-tier strategy with bulletproof protection.
 * 
 * @param {Object} movieData - Movie data
 * @param {Function} generateFresh - Function to generate fresh analysis
 * @param {Function} linkExisting - Function to add links to existing content
 * @returns {Promise<Object>} - Processed movie data
 */
export async function safeMovieProcessing(movieData, generateFresh, linkExisting, supabase) {
  console.log(`🛡️ Zero-waste processing: ${movieData.title} (${movieData.year})`);

  // Get current completion status
  const status = await getMovieCompletionStatus(supabase, movieData.id);
  
  switch (status.tier) {
    case 'complete':
      console.log(`⚡ Tier 1 - Skipping complete content: ${movieData.title}`);
      return {
        ...status.analysis,
        cached: true,
        source: 'zero_waste_skip',
        tier: 'complete'
      };

    case 'unlinked':
      console.log(`🔗 Tier 2 - Adding links to existing content: ${movieData.title}`);
      const linkedContent = await linkExisting(status.analysis, movieData);
      return {
        ...linkedContent,
        cached: false,
        source: 'zero_waste_link_only',
        tier: 'unlinked'
      };

    case 'missing':
      console.log(`🆕 Tier 3 - Generating fresh content with integrated linking: ${movieData.title}`);
      const freshContent = await generateFresh(movieData);
      return {
        ...freshContent,
        cached: false,
        source: 'zero_waste_fresh',
        tier: 'missing'
      };

    default:
      throw new Error(`Unknown tier: ${status.tier}`);
  }
}

/**
 * Validate content integrity after processing
 * 
 * @param {string} originalContent - Content before processing
 * @param {string} processedContent - Content after processing  
 * @param {string} operation - Type of operation performed
 * @returns {Object} - Validation result
 */
export function validateContentIntegrity(originalContent, processedContent, operation) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };

  // For Tier 1 (complete) content, it should be unchanged
  if (operation === 'tier1_skip' && originalContent !== processedContent) {
    validation.valid = false;
    validation.errors.push('Tier 1 content was modified - CRITICAL DATA INTEGRITY VIOLATION');
  }

  // Check that existing links weren't broken
  const originalLinks = (originalContent?.match(/<a href="\/movie\/\d+"/g) || []).length;
  const processedLinks = (processedContent?.match(/<a href="\/movie\/\d+"/g) || []).length;
  
  if (processedLinks < originalLinks) {
    validation.valid = false;
    validation.errors.push(`Lost ${originalLinks - processedLinks} existing links - DATA CORRUPTION`);
  }

  // Check JSON structure integrity (for nuclear static)
  if (operation.includes('static')) {
    try {
      JSON.parse(processedContent);
    } catch (error) {
      validation.valid = false;
      validation.errors.push('Invalid JSON structure after processing');
    }
  }

  return validation;
}

/**
 * Emergency protection check - stops processing if system is in dangerous state
 * 
 * @param {Object} systemState - Current system state
 * @returns {boolean} - True if safe to proceed
 */
export function emergencyProtectionCheck(systemState = {}) {
  const checks = {
    batchJobsRunning: false, // TODO: Check if wasteful batch jobs are running
    highErrorRate: false,    // TODO: Check recent error rates
    resourceExhaustion: false, // TODO: Check memory/API limits
  };

  // If any emergency condition is true, stop processing
  const emergencyConditions = Object.values(checks);
  const hasEmergency = emergencyConditions.some(condition => condition);

  if (hasEmergency) {
    console.error('🚨 EMERGENCY PROTECTION ACTIVATED - Stopping all content processing');
    return false;
  }

  return true;
}

/**
 * Cost tracking for zero-waste monitoring
 * 
 * @param {string} operation - Operation type
 * @param {Object} result - Operation result
 * @returns {Object} - Cost tracking data
 */
export function trackZeroWasteSavings(operation, result) {
  const costEstimates = {
    claude_analysis: 0.10,  // $0.10 per analysis
    tmdb_api_call: 0.001,   // $0.001 per TMDB call
    poster_fetch: 0.005,    // $0.005 per poster fetch
  };

  const savings = {
    operation,
    timestamp: new Date().toISOString(),
    costSaved: 0,
    costIncurred: 0,
    reason: ''
  };

  switch (operation) {
    case 'tier1_skip':
      savings.costSaved = costEstimates.claude_analysis;
      savings.reason = 'Skipped regeneration of complete content';
      break;
    
    case 'tier2_link_only':
      savings.costSaved = costEstimates.claude_analysis;
      savings.costIncurred = costEstimates.tmdb_api_call * (result.linksAdded || 0);
      savings.reason = 'Added links without regenerating analysis';
      break;
    
    case 'tier3_fresh':
      savings.costIncurred = costEstimates.claude_analysis + 
                           costEstimates.tmdb_api_call * (result.linksAdded || 0);
      savings.reason = 'Generated fresh content with integrated linking';
      break;
  }

  return savings;
}