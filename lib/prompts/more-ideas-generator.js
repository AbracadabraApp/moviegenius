/**
 * More Ideas Generator Prompt - Focused on movie recommendations
 * 
 * Generates 20-30 related movie recommendations with connection explanations
 * Ordered from closest connections to looser thematic links
 */

import { CORE_VOICE } from './core.js';

export const MORE_IDEAS_PROMPT = `${CORE_VOICE}

You are generating movie recommendations for a film discovery platform. Your task is to suggest 20-30 related movies that users might enjoy if they're interested in the given film.

Here is the film you need to analyze:

<film_title>
{{FILM_TITLE}}
</film_title>

CRITICAL: Your response must contain ONLY the JSON structure specified below. No explanatory text outside the JSON.

Movie Recommendation Guidelines:

1. Recommendation Strategy (Close → Loose Connections):
TIER 1 (Movies 1-8): CLOSEST CONNECTIONS
- Same director's other notable films
- Same genre + similar themes (e.g., both neo-noir thrillers)
- Direct sequels/prequels or franchise films
- Films with shared lead actors in similar roles
- Movies explicitly influenced by or influencing this film

TIER 2 (Movies 9-18): THEMATIC CONNECTIONS  
- Similar genre but different time periods
- Different genres but similar themes (power, corruption, identity)
- Same cinematographer, composer, or key crew creating similar tone
- Films from same movement/era (French New Wave, 90s indie, etc.)
- Movies with similar narrative structure or storytelling approach

TIER 3 (Movies 19-30): LOOSE BUT VALID CONNECTIONS
- Shared cultural context or zeitgeist 
- Similar visual style or mood
- Comparable character archetypes
- Films that sparked similar cultural conversations
- Movies popular with similar audiences
- Tangential genre connections (thriller → mystery → crime)

2. Connection Descriptions:
- Keep each connection 4-8 words
- Be specific about the connection type
- Focus on what makes them related, not just quality
- Vary your language - don't repeat connection patterns

Examples of good connections:
- "Same director's earlier masterpiece" 
- "Similar corporate corruption themes"
- "Shared neo-noir visual style"
- "Both feature unreliable narrators"
- "Another psychological thriller from 1999"
- "Same cinematographer's dark aesthetic"

3. Movie Selection Criteria:
- Include mix of classic and modern films (1940s-2020s)
- Prioritize well-known films users can actually watch
- Include both mainstream and art-house where appropriate
- Vary decades to show evolution of themes/genres
- Include international films if relevant to connection

4. Quality Standards:
- Every connection must be genuinely valid
- Prefer specific connections over generic ones
- Order strictly by connection strength (closest first)
- Aim for exactly 25-30 recommendations
- Include variety in release years and styles

Your response must contain ONLY this JSON structure:

{
  "moreIdeas": [
    {
      "title": "Movie Title",
      "year": 1999,
      "connection": "Specific connection explanation (4-8 words)"
    }
  ],
  "metadata": {
    "sourceMovie": "{{FILM_TITLE}}",
    "totalRecommendations": 0,
    "connectionTiers": {
      "closest": 8,
      "thematic": 10, 
      "loose": 12
    },
    "generatedAt": "{{TIMESTAMP}}"
  }
}`;

/**
 * Generate More Ideas recommendations for a movie
 * @param {string} movieTitle - Movie title and year
 * @returns {string} Formatted prompt ready for API call
 */
export function buildMoreIdeasPrompt(movieTitle) {
  return MORE_IDEAS_PROMPT
    .replace(/{{FILM_TITLE}}/g, movieTitle)
    .replace('{{TIMESTAMP}}', new Date().toISOString());
}

/**
 * Validate More Ideas response format
 * @param {Object} response - Parsed JSON response from API
 * @returns {Object} Validation result with errors if any
 */
export function validateMoreIdeasResponse(response) {
  const errors = [];
  
  if (!response.moreIdeas || !Array.isArray(response.moreIdeas)) {
    errors.push('Missing or invalid moreIdeas array');
    return { valid: false, errors };
  }
  
  const { moreIdeas } = response;
  
  // Check count
  if (moreIdeas.length < 20 || moreIdeas.length > 30) {
    errors.push(`Should have 20-30 recommendations, got: ${moreIdeas.length}`);
  }
  
  // Check each recommendation
  moreIdeas.forEach((idea, index) => {
    if (!idea.title) {
      errors.push(`Recommendation ${index + 1} missing title`);
    }
    
    if (!idea.year || typeof idea.year !== 'number') {
      errors.push(`Recommendation ${index + 1} missing/invalid year`);
    }
    
    if (!idea.connection) {
      errors.push(`Recommendation ${index + 1} missing connection`);
    } else {
      const wordCount = idea.connection.split(' ').length;
      if (wordCount < 4 || wordCount > 8) {
        errors.push(`Recommendation ${index + 1} connection should be 4-8 words, got: ${wordCount}`);
      }
    }
  });
  
  // Check for duplicates
  const titles = moreIdeas.map(idea => `${idea.title} (${idea.year})`);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size !== titles.length) {
    errors.push('Contains duplicate movie recommendations');
  }
  
  // Check connection variety (avoid repetitive language)
  const connections = moreIdeas.map(idea => idea.connection.toLowerCase());
  const connectionWords = connections.join(' ').split(' ');
  const wordCounts = {};
  connectionWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  const overusedWords = Object.entries(wordCounts)
    .filter(([word, count]) => count > 5 && word.length > 4)
    .map(([word]) => word);
    
  if (overusedWords.length > 0) {
    errors.push(`Overused connection words: ${overusedWords.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    count: moreIdeas.length,
    connectionWordCounts: moreIdeas.map(idea => idea.connection.split(' ').length),
    avgConnectionLength: moreIdeas.reduce((sum, idea) => 
      sum + idea.connection.split(' ').length, 0) / moreIdeas.length
  };
}

/**
 * Example usage and test data
 */
export const EXAMPLE_USAGE = {
  // Test with complex film
  complex: () => buildMoreIdeasPrompt("Fight Club (1999)"),
  
  // Test with classic film  
  classic: () => buildMoreIdeasPrompt("Citizen Kane (1941)"),
  
  // Test with genre film
  genre: () => buildMoreIdeasPrompt("Blade Runner (1982)")
};