/**
 * MovieGenius Analysis Validation Framework
 * 
 * OBJECTIVE PASS/FAIL validation only - no subjective quality scores.
 * Either an analysis meets the technical requirements or it doesn't.
 */

/**
 * Analysis Validation (PASS/FAIL ONLY)
 * Objective, measurable criteria that determine if analysis is usable
 */
function validateAnalysis(content) {
  const requirements = {
    // Technical requirements
    isString: typeof content === 'string',
    hasMinLength: content.length >= 2000,
    hasMaxLength: content.length <= 8000,

    // Required format sections
    hasParagraphs: /^PARAGRAPH:/gm.test(content),
    hasMovies: /^MOVIES:/gm.test(content),
    hasExploreTopics: /^EXPLORE_FURTHER:/gm.test(content),
    
    // Conclusion requirement
    hasConclusion: hasValidConclusion(content),

    // Minimum section counts (absolute requirements)
    hasMinParagraphs: (content.match(/^PARAGRAPH:/gm) || []).length >= 4,
    hasMinMovies: (content.match(/^MOVIES:/gm) || []).length >= 2,
    hasMinExploreTopics: (content.match(/^EXPLORE_FURTHER:/gm) || []).length >= 5,

    // Format compliance
    hasBoldFilmReferences: /\*\*[^*]+\*\*\s*\(\d{4}\)/.test(content),
    hasProperMovieFormat: /^MOVIES:\s*[^|]+\|\d{4}\|[^|]+\|/m.test(content),
    
    // Readability requirement
    paragraphsNotTooLong: hasReasonableParagraphLengths(content),
  };

  // Simple pass/fail - ALL requirements must be met
  const isValid = Object.values(requirements).every(Boolean);
  
  return {
    isValid,
    requirements,
    failedRequirements: Object.entries(requirements)
      .filter(([key, passed]) => !passed)
      .map(([key]) => key)
  };
}

/**
 * Validates that the analysis has a proper conclusion
 * Should be 2-3 sentences explaining why the movie is important/worth watching
 */
function hasValidConclusion(content) {
  // Look for conclusion patterns in the last paragraph
  const paragraphs = content.split(/^PARAGRAPH:/gm).filter(p => p.trim());
  if (paragraphs.length === 0) return false;
  
  // Extract just the paragraph text (before EXPLORE_FURTHER or MORE_IDEAS)
  const lastParagraphRaw = paragraphs[paragraphs.length - 1].trim();
  const endMarkers = [/^EXPLORE_FURTHER:/m, /^MORE_IDEAS:/m, /^MOVIES:/m, /^SUBHEAD:/m];
  
  let lastParagraph = lastParagraphRaw;
  for (const marker of endMarkers) {
    const match = lastParagraph.match(marker);
    if (match) {
      lastParagraph = lastParagraph.substring(0, match.index).trim();
      break;
    }
  }
  
  if (!lastParagraph) return false;
  
  // Check for conclusion indicators
  const conclusionIndicators = [
    /why.*watch/i,
    /worth.*viewing/i,
    /essential.*viewing/i,
    /recommend/i,
    /should.*see/i,
    /must.*watch/i,
    /viewing.*experience/i,
    /lasting.*appeal/i,
    /compelling.*qualities/i,
    /stands.*test.*time/i,
    /^watch.*today/i,  // "Watch [Movie] today"
    /^watch.*for/i,    // "Watch [Movie] for..."
    /experience.*film/i,
    /see.*film/i,
    /essential.*for/i  // "essential for understanding"
  ];
  
  const hasIndicator = conclusionIndicators.some(pattern => pattern.test(lastParagraph));
  
  // Check sentence count (should be 2-3 sentences)
  const sentences = lastParagraph.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const reasonableSentenceCount = sentences.length >= 2 && sentences.length <= 4;
  
  // Check length (not too long for a conclusion - 100 words ≈ 500-600 chars)
  const reasonableLength = lastParagraph.length >= 100 && lastParagraph.length <= 600;
  
  return hasIndicator && reasonableSentenceCount && reasonableLength;
}

/**
 * Validates that paragraphs are reasonable length (not too long)
 * Target: 125-200 words per paragraph for readability
 */
function hasReasonableParagraphLengths(content) {
  const paragraphs = content.split(/^PARAGRAPH:/gm)
    .filter(p => p.trim())
    .map(p => p.trim());
  
  if (paragraphs.length === 0) return false;
  
  let validParagraphs = 0;
  let tooLongParagraphs = 0;
  
  for (const paragraph of paragraphs) {
    const wordCount = paragraph.split(/\s+/).length;
    
    if (wordCount >= 50 && wordCount <= 250) {
      validParagraphs++;
    } else if (wordCount > 250) {
      tooLongParagraphs++;
    }
    // Paragraphs under 50 words are ignored (might be incomplete)
  }
  
  // At least 80% of paragraphs should be reasonable length
  // No more than 1 paragraph should be too long
  const reasonableRatio = validParagraphs / (validParagraphs + tooLongParagraphs);
  return reasonableRatio >= 0.8 && tooLongParagraphs <= 1;
}

/**
 * Extract the conclusion from the analysis for quality checking
 */
function extractConclusion(content) {
  const paragraphs = content.split(/^PARAGRAPH:/gm).filter(p => p.trim());
  if (paragraphs.length === 0) return null;
  
  return paragraphs[paragraphs.length - 1].trim();
}

/**
 * Extract slug from analysis content
 * Looks for movie title patterns and creates URL-friendly slug
 */
function extractSlugFromAnalysis(content) {
  // Look for movie title patterns in the content
  const titlePatterns = [
    /\*\*([^*]+)\*\*\s*\((\d{4})\)/, // **Movie Title** (Year)
    /^PARAGRAPH:\s*([^.!?]+)/, // First sentence of first paragraph
  ];

  for (const pattern of titlePatterns) {
    const match = content.match(pattern);
    if (match) {
      let title = match[1].trim();
      
      // Clean up title for slug generation
      title = title.replace(/[^\w\s-]/g, '').trim();
      
      // Create URL-friendly slug
      const slug = title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Validate slug length
      if (slug.length >= 5 && slug.length <= 80) {
        return slug;
      }
    }
  }
  
  return null;
}

/**
 * Extract featured movies from MOVIES: lines
 */
function extractFeaturedMovies(content) {
  const movieLines = content.match(/^MOVIES:\s*(.+)$/gm);
  if (!movieLines) return [];
  
  const movies = [];
  
  for (const line of movieLines) {
    const movieData = line.replace(/^MOVIES:\s*/, '').trim();
    const parts = movieData.split('|');
    
    if (parts.length >= 3) {
      movies.push({
        title: parts[0].trim(),
        year: parseInt(parts[1].trim()) || null,
        description: parts[2].trim(),
        streaming: parts[3] ? parts[3].trim() : 'TBD',
      });
    }
  }
  
  return movies;
}

/**
 * Extract explore topics from EXPLORE_FURTHER: lines
 */
function extractExploreTopics(content) {
  const topicLines = content.match(/^EXPLORE_FURTHER:\s*(.+)$/gm);
  if (!topicLines) return [];
  
  return topicLines.map(line => 
    line.replace(/^EXPLORE_FURTHER:\s*/, '').trim()
  ).filter(topic => topic.length > 0);
}

/**
 * Extract paragraph statistics for monitoring
 */
function extractParagraphStats(content) {
  const paragraphs = content.split(/^PARAGRAPH:/gm)
    .filter(p => p.trim())
    .map(p => p.trim());
  
  const stats = paragraphs.map(p => ({
    wordCount: p.split(/\s+/).length,
    charCount: p.length,
    sentenceCount: p.split(/[.!?]+/).filter(s => s.trim().length > 10).length
  }));
  
  return {
    totalParagraphs: paragraphs.length,
    averageWordCount: stats.reduce((sum, s) => sum + s.wordCount, 0) / stats.length,
    averageCharCount: stats.reduce((sum, s) => sum + s.charCount, 0) / stats.length,
    paragraphStats: stats,
    tooLongCount: stats.filter(s => s.wordCount > 250).length,
    tooShortCount: stats.filter(s => s.wordCount < 50).length
  };
}

/**
 * Generate comprehensive validation report showing quality metrics
 * @param {string} content - Analysis content to validate
 * @param {string} movieTitle - Movie title for context
 * @returns {object} Detailed validation report with scores and insights
 */
function generateValidationReport(content, movieTitle = '') {
  const basicValidation = validateAnalysis(content);
  const paragraphStats = extractParagraphStats(content);
  const featuredMovies = extractFeaturedMovies(content);
  const exploreTopics = extractExploreTopics(content);
  const conclusion = extractConclusion(content);
  
  // Initialize report structure
  const report = {
    movieTitle,
    timestamp: new Date().toISOString(),
    overallScore: 0,
    validationStatus: 'FAILED',
    
    requirements: {
      structure: { score: 0, details: {} },
      content: { score: 0, details: {} },
      formatting: { score: 0, details: {} },
      voice: { score: 0, details: {} }
    },
    
    warnings: [],
    strengths: [],
    recommendations: []
  };

  // === STRUCTURE VALIDATION (25 points) ===
  const structureDetails = {
    hasParagraphs: basicValidation.requirements.hasParagraphs,
    paragraphCount: paragraphStats.totalParagraphs,
    hasMovies: basicValidation.requirements.hasMovies,
    movieCount: featuredMovies.length,
    hasExploreTopics: basicValidation.requirements.hasExploreTopics,
    exploreTopicCount: exploreTopics.length,
    hasConclusion: basicValidation.requirements.hasConclusion,
    hasSubheads: /^SUBHEAD:/gm.test(content),
    subheadCount: (content.match(/^SUBHEAD:/gm) || []).length
  };

  let structureScore = 0;
  if (structureDetails.hasParagraphs) structureScore += 5;
  if (structureDetails.paragraphCount >= 4) structureScore += 5;
  if (structureDetails.hasMovies) structureScore += 3;
  if (structureDetails.movieCount >= 2) structureScore += 3;
  if (structureDetails.hasExploreTopics) structureScore += 3;
  if (structureDetails.exploreTopicCount >= 5) structureScore += 3;
  if (structureDetails.hasConclusion) structureScore += 3;

  report.requirements.structure = { score: structureScore, details: structureDetails };

  // === CONTENT QUALITY VALIDATION (39 points) ===
  const totalWords = paragraphStats.totalParagraphs > 0 ? 
    paragraphStats.paragraphStats.reduce((sum, p) => sum + p.wordCount, 0) : 0;
  
  // Extract film references with years
  const filmReferences = (content.match(/\*\*[^*]+\*\*\s*\(\d{4}\)/g) || []).length;
  
  // Check decade spread
  const yearMatches = content.match(/\((\d{4})\)/g) || [];
  const decades = [...new Set(yearMatches.map(y => {
    const year = parseInt(y.replace(/[()]/g, ''));
    return `${Math.floor(year / 10) * 10}s`;
  }))];

  // Check for technical depth indicators
  const technicalIndicators = [
    /cinematography|photography|camera|lens|shot|angle/i,
    /director|directing|directorial|helmed by/i,
    /soundtrack|score|music|composer/i,
    /editing|cut|montage|pacing/i,
    /production|budget|studio|filming/i,
    /performance|acting|portrayal|character/i
  ];
  const technicalDepth = technicalIndicators.some(pattern => pattern.test(content));

  // Check for cultural impact indicators
  const culturalIndicators = [
    /influence|influenced|impact|legacy|changed/i,
    /culture|cultural|society|social/i,
    /genre|movement|revolution|breakthrough/i,
    /classic|masterpiece|landmark|seminal/i
  ];
  const culturalImpact = culturalIndicators.some(pattern => pattern.test(content));

  // Check for specific scene references (new requirement)
  const sceneIndicators = [
    /scene where|in the scene|the opening scene|final scene|climactic scene/i,
    /sequence where|opening sequence|closing sequence|the montage/i,
    /moment when|the shot where|camera|lighting|sound design/i,
    /dialogue between|conversation where|monologue/i,
    /visual of|image of|frame showing|composition/i
  ];
  const specificScenes = sceneIndicators.filter(pattern => pattern.test(content)).length;

  const contentDetails = {
    wordCount: totalWords,
    targetRange: [800, 1000], // Adjusted based on user feedback
    filmReferences,
    decadeSpread: decades,
    technicalDepth,
    culturalImpact,
    specificScenes,
    paragraphLengths: paragraphStats.paragraphStats.map(p => p.wordCount),
    averageParagraphLength: Math.round(paragraphStats.averageWordCount)
  };

  let contentScore = 0;
  
  // Word count scoring (0-10 points) - Updated for 800-1000 target
  if (totalWords >= 800 && totalWords <= 1000) contentScore += 10;
  else if (totalWords >= 700 && totalWords <= 1100) contentScore += 7;
  else if (totalWords >= 500) contentScore += 4;

  // Film references (0-8 points) - Updated for new 6+ requirement
  if (filmReferences >= 6) contentScore += 8;
  else if (filmReferences >= 4) contentScore += 5;
  else if (filmReferences >= 2) contentScore += 2;

  // Decade spread (0-5 points)
  if (decades.length >= 4) contentScore += 5;
  else if (decades.length >= 3) contentScore += 3;
  else if (decades.length >= 2) contentScore += 1;

  // Technical depth (0-6 points)
  if (technicalDepth) contentScore += 6;

  // Cultural impact (0-6 points)
  if (culturalImpact) contentScore += 6;

  // Specific scene references (0-4 points) - Adjusted to reward 1+ scenes
  if (specificScenes >= 2) contentScore += 4;
  else if (specificScenes >= 1) contentScore += 4; // Full points for 1+ scenes

  report.requirements.content = { score: contentScore, details: contentDetails };

  // === FORMATTING VALIDATION (25 points) ===
  const properMovieFormat = basicValidation.requirements.hasProperMovieFormat;
  const boldReferences = basicValidation.requirements.hasBoldFilmReferences;
  
  // Check conclusion word count
  let conclusionWordCount = 0;
  if (conclusion) {
    const conclusionText = conclusion.split(/^EXPLORE_FURTHER:|^MORE_IDEAS:|^SUBHEAD:/m)[0].trim();
    conclusionWordCount = conclusionText.split(/\s+/).length;
  }

  const formattingDetails = {
    properMovieFormat,
    boldReferences,
    conclusionWordCount,
    conclusionTarget: 100,
    movieFormatCount: featuredMovies.filter(m => m.title && m.year && m.description).length,
    totalMovieLines: featuredMovies.length
  };

  let formattingScore = 0;
  if (properMovieFormat) formattingScore += 8;
  if (boldReferences) formattingScore += 8;
  if (conclusionWordCount >= 80 && conclusionWordCount <= 120) formattingScore += 6;
  else if (conclusionWordCount >= 60 && conclusionWordCount <= 140) formattingScore += 3;
  if (formattingDetails.movieFormatCount === formattingDetails.totalMovieLines) formattingScore += 3;

  report.requirements.formatting = { score: formattingScore, details: formattingDetails };

  // === VOICE CONSISTENCY VALIDATION (15 points) ===
  const bannedPhrases = [
    /cinema offers|cinema explores|cinema has always|cinema provides/i,
    /the genre explores|the genre offers|the genre has always/i,
    /film has always been|film offers viewers|film provides/i,
    /this represents|this symbolizes|this embodies/i,
    /the movie explores themes|the film examines|the narrative delves/i
  ];

  const genericPhrases = bannedPhrases.filter(pattern => pattern.test(content));
  
  // Check for direct, specific openings
  const directOpening = /^PARAGRAPH:\s*([A-Z][^.]{10,100})/m.test(content);
  
  const voiceDetails = {
    genericPhraseCount: genericPhrases.length,
    bannedPhrasesFound: genericPhrases.map(p => {
      const match = content.match(p);
      return match ? match[0] : '';
    }).filter(Boolean),
    directOpening,
    conversationalTone: /\b(nails|revolutionized|showcases|delivers)\b/i.test(content)
  };

  let voiceScore = 15; // Start with full points, deduct for violations
  voiceScore -= genericPhrases.length * 3; // -3 points per banned phrase
  if (!directOpening) voiceScore -= 3;
  if (!voiceDetails.conversationalTone) voiceScore -= 2;
  voiceScore = Math.max(0, voiceScore); // Don't go below 0

  report.requirements.voice = { score: voiceScore, details: voiceDetails };

  // === CALCULATE OVERALL SCORE ===
  report.overallScore = structureScore + contentScore + formattingScore + voiceScore;

  // === DETERMINE STATUS ===
  if (report.overallScore >= 80) {
    report.validationStatus = 'PASSED';
  } else if (report.overallScore >= 60) {
    report.validationStatus = 'WARNING';
  } else {
    report.validationStatus = 'FAILED';
  }

  // === GENERATE WARNINGS (Less punitive approach) ===
  // Only warn for significant deviations, not minor shortfalls
  if (contentDetails.wordCount < 600) {
    report.warnings.push(`Content quite short: ${contentDetails.wordCount} words (suggested: 800-1000)`);
  }
  if (contentDetails.wordCount > 1200) {
    report.warnings.push(`Content quite long: ${contentDetails.wordCount} words (suggested: 800-1000)`);
  }
  if (contentDetails.filmReferences < 3) {
    report.warnings.push(`Few film references: ${contentDetails.filmReferences} (suggested: 6+)`);
  }
  if (decades.length < 2) {
    report.warnings.push(`Limited historical span: ${decades.join(', ')} (suggested: 3+ decades)`);
  }
  if (voiceDetails.bannedPhrasesFound.length > 2) {
    report.warnings.push(`Generic language detected: ${voiceDetails.bannedPhrasesFound.slice(0,2).join(', ')}...`);
  }
  // Remove scene warning - having content beats strict requirements

  // === GENERATE STRENGTHS ===
  if (decades.length >= 4) {
    report.strengths.push(`Excellent decade coverage: ${decades.join(', ')}`);
  }
  if (technicalDepth) {
    report.strengths.push('Strong technical depth with production details');
  }
  if (culturalImpact) {
    report.strengths.push('Good cultural impact and significance coverage');
  }
  if (filmReferences >= 7) {
    report.strengths.push(`Rich film references: ${filmReferences} movies mentioned`);
  }
  if (structureDetails.subheadCount >= 2) {
    report.strengths.push(`Well-structured with ${structureDetails.subheadCount} section breaks`);
  }
  if (contentDetails.specificScenes >= 3) {
    report.strengths.push(`Rich scene analysis with ${contentDetails.specificScenes} specific scenes referenced`);
  }

  // === GENERATE RECOMMENDATIONS (Encouraging rather than demanding) ===
  if (contentDetails.wordCount < 800) {
    report.recommendations.push('Consider expanding with more detailed examples (suggested: 800-1000 words)');
  }
  if (contentDetails.filmReferences < 6) {
    report.recommendations.push('Could include more film comparisons with years for richer context');
  }
  if (!technicalDepth) {
    report.recommendations.push('Consider adding technical craft details (cinematography, sound, etc.)');
  }
  if (decades.length < 3) {
    report.recommendations.push('Could reference films from more decades for historical perspective');
  }
  if (voiceDetails.genericPhraseCount > 1) {
    report.recommendations.push('Consider replacing generic phrases with more specific language');
  }
  if (contentDetails.specificScenes === 0) {
    report.recommendations.push('Could include specific scene descriptions for visual impact');
  }

  return report;
}

/**
 * Simple save validation logic - PASS/FAIL only
 */
async function saveAnalysisWithValidation(movieId, rawContent, usage, cost, supabase) {
  console.log(`🔍 Validating analysis for movie ${movieId}...`);
  
  // Single validation check - either it passes or it doesn't
  const validation = validateAnalysis(rawContent);
  
  if (!validation.isValid) {
    console.log(`❌ Analysis FAILED validation. Missing: ${validation.failedRequirements.join(', ')}`);
    
    // Save as failed analysis for debugging
    await saveFailedAnalysis(movieId, rawContent, 'validation_failed', validation, supabase);
    return { 
      success: false, 
      reason: 'validation_failed', 
      failedRequirements: validation.failedRequirements 
    };
  }

  try {
    // Extract required components using restored functions
    const slug = extractSlugFromAnalysis(rawContent);
    const featuredMovies = extractFeaturedMovies(rawContent);
    const exploreTopics = extractExploreTopics(rawContent);
    const conclusion = extractConclusion(rawContent);
    
    // Generate comprehensive validation report
    const validationReport = generateValidationReport(rawContent, `Movie ${movieId}`);
    
    // Save to movie_analyses with enhanced validation data
    const { error: analysisError } = await supabase
      .from('movie_analyses')
      .insert({
        movie_id: movieId,
        analysis_type: 'page_analysis',
        claude_response: {
          raw_content: rawContent,
          generated_at: new Date().toISOString(),
          cost_estimate: cost,
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          model: 'claude-sonnet-4-5-20250929',
          batch_processed: true,
          validation_passed: validationReport.validationStatus === 'PASSED',
          
          // Extracted components
          extracted_slug: slug,
          featured_movies: featuredMovies,
          explore_topics: exploreTopics,
          conclusion: conclusion,
          
          // Enhanced validation data
          validation_report: validationReport,
          quality_score: validationReport.overallScore,
          validation_warnings: validationReport.warnings,
          validation_strengths: validationReport.strengths,
        },
        query_text: `Validated batch analysis - ${validationReport.validationStatus} (Score: ${validationReport.overallScore})`,
      });

    if (analysisError) throw analysisError;

    // Update movie completion flags
    const updateData = {
      last_processed_at: new Date().toISOString(),
      has_linked_analysis: validationReport.validationStatus !== 'FAILED',  // Ready for linking if not failed
      analysis_completed_at: new Date().toISOString()
    };
    
    // Add slug if successfully extracted
    if (slug && slug.length >= 5 && slug.length <= 80) {
      updateData.slug = slug;
      updateData.slug_complete = true;
    }

    const { error: movieError } = await supabase
      .from('movies')
      .update(updateData)
      .eq('id', movieId);

    if (movieError) console.warn(`⚠️ Failed to update movie flags: ${movieError.message}`);

    console.log(`✅ Analysis ${validationReport.validationStatus} validation and saved for ${movieId} (Score: ${validationReport.overallScore})`);
    
    return {
      success: true,
      validationPassed: validationReport.validationStatus === 'PASSED',
      validationStatus: validationReport.validationStatus,
      qualityScore: validationReport.overallScore,
      validationReport: validationReport,
      slug: slug,
      featuredMoviesCount: featuredMovies.length,
      hasConclusion: !!conclusion
    };

  } catch (error) {
    console.error(`❌ Database error saving analysis for ${movieId}:`, error.message);
    return { success: false, reason: 'database_error', error: error.message };
  }
}

/**
 * Save failed analysis for debugging
 */
async function saveFailedAnalysis(movieId, rawContent, reason, validation, supabase) {
  try {
    await supabase
      .from('movie_analyses')
      .insert({
        movie_id: movieId,
        analysis_type: 'page_analysis_failed',
        claude_response: {
          raw_content: rawContent,
          generated_at: new Date().toISOString(),
          validation_failed: true,
          failed_requirements: validation.failedRequirements,
          failure_reason: reason
        },
        query_text: `FAILED validation: ${validation.failedRequirements.join(', ')}`
      });
  } catch (error) {
    console.error(`Failed to save failed analysis: ${error.message}`);
  }
}

export {
  validateAnalysis,
  hasValidConclusion,
  hasReasonableParagraphLengths,
  extractConclusion,
  extractParagraphStats,
  saveAnalysisWithValidation,
  // New extraction functions
  extractSlugFromAnalysis,
  extractFeaturedMovies,
  extractExploreTopics,
  // New validation report system
  generateValidationReport
};