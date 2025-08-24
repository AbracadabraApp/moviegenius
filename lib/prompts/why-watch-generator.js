/**
 * Why Watch Generator Prompt - Focused on recommendation generation
 * 
 * Generates opinionated movie recommendations with YES/NO binary scoring
 * and specific, varied vocabulary for "Why You Should Watch" reasons.
 */

import { CORE_VOICE } from './core.js';

export const WHY_WATCH_PROMPT = `${CORE_VOICE}

You are generating focused "Why Watch" recommendations for a movie database. Your analysis will be used by film enthusiasts who want honest, direct opinions.

Here is the film you need to analyze:

<film_title>
{{FILM_TITLE}}
</film_title>

<movie_data>
{{MOVIE_DATA}}
</movie_data>

CRITICAL: Your response must contain ONLY the JSON structure specified below. No explanatory text outside the JSON.

Why Watch Recommendation Guidelines:

1. Binary Recommendation (balanced but fair):
- YES: Worth someone's time - essential viewing, great entertainment, historical significance, exceptional craft, genuinely enjoyable, or has clear redeeming qualities that outweigh flaws
- NO: Not worth the time investment - poor execution that undermines entertainment value, lacks redeeming qualities, or better alternatives exist. Provide 2 specific problems + 1 better alternative movie to watch instead

IMPORTANT: Aim for roughly 70% YES recommendations. Be encouraging but discriminating - a movie needs genuine merit to earn YES. Consider: Would you actually recommend this to a friend with limited free time?

2. Compelling Reasons (exactly 3):
- Keep each reason 3-6 words (short and punchy)
- CRITICAL: Use different reasoning categories for each reason. Choose from:
  * Performance quality: "Best X performance," "Career-defining acting," "Perfect casting choices"
  * Technical craft: "Revolutionary cinematography," "Groundbreaking sound design," "Editing perfection"  
  * Historical significance: "Essential film history," "Influenced entire genres," "Cultural watershed moment"
  * Entertainment value: "Pure fun escapism," "Perfectly paced thriller," "Endlessly rewatchable"
  * Cultural impact: "Changed public discourse," "Predicted social trends," "Sparked cultural debates"
- FOR NO RECOMMENDATIONS: Format as "Problem 1," "Problem 2," "Consider <link>Alternative Movie</link> instead"
  * Examples: "Terrible dialogue," "Boring pacing," "Consider <link>Seven</link> instead"
  * Examples: "Bad acting," "Weak plot," "Consider <link>Zodiac</link> instead"
- RANDOMIZE the order of categories - DO NOT use patterns like:
  * Always starting with performance 
  * Always ending with historical significance
  * Always putting entertainment in the middle
  * Performance→Technical→Cultural (common formulaic order)
- Vary vocabulary extensively - avoid overused terms: "masterful," "portrayal," "explores," "journey," "stunning," "breathtaking," "compelling," "captivating," "riveting"
- Be opinionated and direct rather than diplomatic

3. Vocabulary Enhancement:
Instead of overused words, try:
- "masterful" → ingenious, meticulous, groundbreaking, revolutionary
- "stunning" → striking, arresting, hypnotic, electric
- "explores" → dissects, interrogates, confronts, unveils
- "compelling" → magnetic, gripping, urgent, essential
- "journey" → transformation, descent, evolution, awakening

Your response must contain ONLY this JSON structure:

{
  "whyWatch": {
    "recommendation": "YES|NO",
    "reasons": [
      "Reason 1 (3-6 words)",
      "Reason 2 (3-6 words)", 
      "Reason 3 (3-6 words)"
    ]
  },
  "metadata": {
    "title": "{{FILM_TITLE}}",
    "generatedAt": "{{TIMESTAMP}}",
    "wordCounts": [0, 0, 0],
    "vocabularyScore": "fresh|mixed|cliched"
  }
}`;

/**
 * Generate Why Watch recommendation for a movie
 * @param {string} movieTitle - Movie title and year
 * @param {Object} movieData - Additional movie data (director, genre, etc.)
 * @returns {string} Formatted prompt ready for API call
 */
export function buildWhyWatchPrompt(movieTitle, movieData = {}) {
  return WHY_WATCH_PROMPT
    .replace(/{{FILM_TITLE}}/g, movieTitle)
    .replace('{{MOVIE_DATA}}', JSON.stringify(movieData, null, 2))
    .replace('{{TIMESTAMP}}', new Date().toISOString());
}

/**
 * Validate Why Watch response format
 * @param {Object} response - Parsed JSON response from API
 * @returns {Object} Validation result with errors if any
 */
export function validateWhyWatchResponse(response) {
  const errors = [];
  
  if (!response.whyWatch) {
    errors.push('Missing whyWatch object');
    return { valid: false, errors };
  }
  
  const { recommendation, reasons } = response.whyWatch;
  
  // Check recommendation
  if (!['YES', 'NO'].includes(recommendation)) {
    errors.push(`Invalid recommendation: ${recommendation}`);
  }
  
  // Check reasons array
  if (!Array.isArray(reasons) || reasons.length !== 3) {
    errors.push(`Reasons must be array of exactly 3 items, got: ${reasons?.length}`);
  } else {
    reasons.forEach((reason, index) => {
      const wordCount = reason.split(' ').length;
      if (wordCount < 3 || wordCount > 6) {
        errors.push(`Reason ${index + 1} has ${wordCount} words (should be 3-6): "${reason}"`);
      }
    });
  }
  
  // Check for banned vocabulary
  const allText = reasons?.join(' ').toLowerCase() || '';
  const bannedWords = ['masterful', 'portrayal', 'explores', 'journey', 'stunning', 'breathtaking', 'compelling', 'captivating', 'riveting'];
  const foundBanned = bannedWords.filter(word => allText.includes(word));
  
  if (foundBanned.length > 0) {
    errors.push(`Contains overused words: ${foundBanned.join(', ')}`);
  }
  
  // Check for reasoning category variety
  const categoryPatterns = checkReasoningVariety(reasons);
  if (categoryPatterns.formulaic) {
    errors.push(`Formulaic pattern detected: ${categoryPatterns.issue}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    wordCounts: reasons?.map(r => r.split(' ').length) || [],
    bannedWords: foundBanned
  };
}

/**
 * Check for reasoning category variety to avoid formulaic patterns
 * @param {string[]} reasons - Array of reasons to analyze
 * @returns {Object} Analysis of reasoning patterns
 */
function checkReasoningVariety(reasons) {
  if (!reasons || reasons.length === 0) {
    return { formulaic: false };
  }
  
  const performanceKeywords = ['performance', 'acting', 'cast', 'star', 'actor', 'actress', 'role'];
  const technicalKeywords = ['cinematography', 'direction', 'editing', 'sound', 'score', 'visual', 'camera'];
  const historicalKeywords = ['influential', 'groundbreaking', 'revolutionary', 'pioneering', 'essential', 'classic'];
  const entertainmentKeywords = ['fun', 'exciting', 'thrilling', 'entertaining', 'engaging', 'paced'];
  const culturalKeywords = ['cultural', 'social', 'political', 'discourse', 'zeitgeist', 'relevant'];
  
  let performanceCount = 0;
  let technicalCount = 0;
  let historicalCount = 0;
  let entertainmentCount = 0;
  let culturalCount = 0;
  
  reasons.forEach(reason => {
    const lowerReason = reason.toLowerCase();
    if (performanceKeywords.some(keyword => lowerReason.includes(keyword))) performanceCount++;
    if (technicalKeywords.some(keyword => lowerReason.includes(keyword))) technicalCount++;
    if (historicalKeywords.some(keyword => lowerReason.includes(keyword))) historicalCount++;
    if (entertainmentKeywords.some(keyword => lowerReason.includes(keyword))) entertainmentCount++;
    if (culturalKeywords.some(keyword => lowerReason.includes(keyword))) culturalCount++;
  });
  
  // Check for formulaic patterns
  if (performanceCount >= 2) {
    return { formulaic: true, issue: "Too many performance-focused reasons" };
  }
  
  if (technicalCount >= 2) {
    return { formulaic: true, issue: "Too many technical craft reasons" };
  }
  
  // Check for the classic "performance + technical + influence" pattern
  if (performanceCount >= 1 && technicalCount >= 1 && historicalCount >= 1) {
    return { formulaic: true, issue: "Classic performance-technical-influence pattern" };
  }
  
  // Check for positional patterns (common formulaic orders)
  const positionalPattern = checkPositionalPattern(reasons);
  if (positionalPattern.formulaic) {
    return { formulaic: true, issue: positionalPattern.issue };
  }
  
  return { 
    formulaic: false, 
    categories: {
      performance: performanceCount,
      technical: technicalCount, 
      historical: historicalCount,
      entertainment: entertainmentCount,
      cultural: culturalCount
    }
  };
}

/**
 * Check for positional patterns in reasoning order
 * @param {string[]} reasons - Array of 3 reasons in order
 * @returns {Object} Analysis of positional patterns
 */
function checkPositionalPattern(reasons) {
  if (!reasons || reasons.length !== 3) {
    return { formulaic: false };
  }
  
  const categories = reasons.map(reason => categorizeReason(reason));
  const pattern = categories.join('→');
  
  // Common formulaic patterns to detect
  const formulaicPatterns = [
    { pattern: 'performance→technical→historical', name: 'Classic performance-technical-influence order' },
    { pattern: 'performance→historical→cultural', name: 'Performance-first pattern' },
    { pattern: 'technical→performance→historical', name: 'Technical-performance-influence order' },
    { pattern: 'historical→performance→technical', name: 'Historical-first formulaic order' },
    { pattern: 'performance→entertainment→historical', name: 'Performance-entertainment-historical pattern' }
  ];
  
  const foundPattern = formulaicPatterns.find(fp => fp.pattern === pattern);
  if (foundPattern) {
    return { 
      formulaic: true, 
      issue: `Positional pattern: ${foundPattern.name}`,
      detectedPattern: pattern 
    };
  }
  
  // Check for performance always in first position (common issue)
  if (categories[0] === 'performance') {
    return { 
      formulaic: true, 
      issue: "Performance reason always in first position",
      detectedPattern: pattern 
    };
  }
  
  // Check for historical always in last position (common issue)
  if (categories[2] === 'historical') {
    return { 
      formulaic: true, 
      issue: "Historical reason always in last position",
      detectedPattern: pattern 
    };
  }
  
  return { formulaic: false, pattern };
}

/**
 * Categorize a single reason into reasoning type
 * @param {string} reason - Single reason text
 * @returns {string} Category name
 */
function categorizeReason(reason) {
  const lowerReason = reason.toLowerCase();
  
  const performanceKeywords = ['performance', 'acting', 'cast', 'star', 'actor', 'actress', 'role', 'career'];
  const technicalKeywords = ['cinematography', 'direction', 'editing', 'sound', 'score', 'visual', 'camera', 'technical'];
  const historicalKeywords = ['influential', 'groundbreaking', 'revolutionary', 'pioneering', 'essential', 'classic', 'history'];
  const entertainmentKeywords = ['fun', 'exciting', 'thrilling', 'entertaining', 'engaging', 'paced', 'rewatchable'];
  const culturalKeywords = ['cultural', 'social', 'political', 'discourse', 'zeitgeist', 'relevant', 'predicted'];
  
  if (performanceKeywords.some(keyword => lowerReason.includes(keyword))) return 'performance';
  if (technicalKeywords.some(keyword => lowerReason.includes(keyword))) return 'technical';
  if (historicalKeywords.some(keyword => lowerReason.includes(keyword))) return 'historical';
  if (entertainmentKeywords.some(keyword => lowerReason.includes(keyword))) return 'entertainment';
  if (culturalKeywords.some(keyword => lowerReason.includes(keyword))) return 'cultural';
  
  return 'other';
}

/**
 * Example usage and test data
 */
export const EXAMPLE_USAGE = {
  // Test with classic film
  classic: () => buildWhyWatchPrompt("The Godfather (1972)", {
    director: "Francis Ford Coppola",
    genre: "Crime Drama",
    year: 1972
  }),
  
  // Test with modern film  
  modern: () => buildWhyWatchPrompt("Parasite (2019)", {
    director: "Bong Joon-ho",
    genre: "Thriller",
    year: 2019
  }),
  
  // Test with questionable film
  questionable: () => buildWhyWatchPrompt("The Emoji Movie (2017)", {
    director: "Tony Leondis", 
    genre: "Animation",
    year: 2017
  })
};