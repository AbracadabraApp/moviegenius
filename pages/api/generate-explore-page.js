// pages/api/generate-explore-page.js
/**
 * Static Explore Further Page Generator
 *
 * Converts slow Ask queries triggered by "Explore Further" links into
 * fast static pages. This solves the 15-30 second load time bottleneck
 * by pre-generating content and serving it instantly.
 *
 * Process:
 * 1. Take an "Explore Further" topic and context
 * 2. Generate comprehensive content using Claude
 * 3. Cache the result as a static page
 * 4. Return structured data for rendering
 */

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import {
  withErrorHandling,
  ApiErrors,
  successResponse,
  validateRequiredFields,
} from '../../lib/api-utils';
import { getCache } from '../../lib/cache.js';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = getPool();

/**
 * Generate static content for Explore Further topics
 *
 * Creates comprehensive, educational content that would normally
 * require a slow Ask query. Content is cached indefinitely since
 * Explore Further topics are relatively stable.
 *
 * @param {string} topic - The explore further topic
 * @param {string} context - Optional context (movie title, person name, etc.)
 * @returns {Promise<Object>} Generated page content with structured sections
 */
async function generateExplorePage(topic, context = '') {
  const cache = getCache();

  // Create cache key for this explore page
  const cacheKey = `explore_page:${topic}:${context}`.toLowerCase().replace(/[^a-z0-9:]/g, '_');

  return await cache.cacheClaudeResponse(
    cacheKey,
    'claude-3-5-sonnet-20241022',
    async () => {
      console.log(`🔄 Generating static Explore Further page: "${topic}" (context: "${context}")`);

      // Build educational prompt for explore page
      const fullTopic = context ? `${topic} (in relation to ${context})` : topic;

      const prompt = `Create comprehensive educational content about "${fullTopic}" for film enthusiasts and students.

Write detailed, substantial analysis suitable for a dedicated page. This should be thorough enough to satisfy users who want to explore this topic deeply.

REQUIREMENTS:
- Write 600-800 words of comprehensive analysis
- Include specific film examples throughout
- Structure with clear organization
- Provide actionable "next steps" for further exploration
- Mention specific directors, techniques, movements, or historical context
- Be educational but engaging

Format your response exactly as:
TITLE: [Clear, engaging title for this explore topic]
PARAGRAPH: [Substantial opening paragraph introducing the topic with specific examples]
PARAGRAPH: [Detailed analysis with film examples and techniques]
PARAGRAPH: [Historical context or evolution of this topic]
SUBHEAD: Key Films and Directors
PARAGRAPH: [Analysis of most important films and filmmakers in this area]
PARAGRAPH: [Technical or aesthetic analysis with specific examples]
SUBHEAD: Modern Influence and Legacy
PARAGRAPH: [How this topic influences contemporary cinema]
PARAGRAPH: [Concluding analysis with recommendations for further exploration]
MOVIES: title|year|description|streaming (8-12 essential films)
NEXT_STEPS: specific suggestion 1|specific suggestion 2|specific suggestion 3`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = message.content[0].text;
        const parsedPage = parseExplorePage(responseText, topic);

        console.log(
          `💾 Generated static page for: "${topic}" (${parsedPage.sections.length} sections)`
        );
        return parsedPage;
      } catch (error) {
        console.error('🔴 Claude API Error for explore page:', error);

        // Fallback to basic structured content
        return generateFallbackExplorePage(topic, context);
      }
    },
    2592000 // 30-day cache (explore topics are stable)
  );
}

/**
 * Parse Claude's explore page response into structured sections
 */
function parseExplorePage(responseText, topic = 'Film Topic') {
  const lines = responseText.split('\n');
  const sections = [];
  const movies = [];
  const nextSteps = [];

  let currentSection = null;
  let title = topic; // fallback

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith('TITLE:')) {
      title = trimmedLine.replace('TITLE:', '').trim();
    } else if (trimmedLine.startsWith('PARAGRAPH:')) {
      // Push previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = {
        type: 'text',
        content: trimmedLine.replace('PARAGRAPH:', '').trim(),
      };
    } else if (trimmedLine.startsWith('SUBHEAD:')) {
      // Push previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      // Add subhead section
      sections.push({
        type: 'subhead',
        content: trimmedLine.replace('SUBHEAD:', '').trim(),
      });
      currentSection = null;
    } else if (trimmedLine.startsWith('MOVIES:')) {
      const movieLine = trimmedLine.replace('MOVIES:', '').trim();
      if (movieLine) {
        const parts = movieLine.split('|');
        if (parts.length >= 2) {
          const [title, year, description, streaming] = parts;
          movies.push({
            title: title?.trim() || 'Unknown Title',
            year: parseInt(year?.trim()) || new Date().getFullYear(),
            slug: description?.trim() || 'Essential viewing',
            streaming: streaming?.trim() || 'Check streaming services',
          });
        }
      }
    } else if (trimmedLine.startsWith('NEXT_STEPS:')) {
      const stepsLine = trimmedLine.replace('NEXT_STEPS:', '').trim();
      if (stepsLine) {
        const steps = stepsLine
          .split('|')
          .map(s => s.trim())
          .filter(s => s);
        nextSteps.push(...steps);
      }
    } else if (currentSection && trimmedLine) {
      // Continue current section
      currentSection.content += ' ' + trimmedLine;
    }
  }

  // Push final section
  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    title,
    sections,
    movies,
    nextSteps,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Fallback content generator when Claude API fails
 */
function generateFallbackExplorePage(topic, context) {
  return {
    title: topic,
    sections: [
      {
        type: 'text',
        content: `${topic} represents a fascinating area of cinema that has influenced countless films and filmmakers. This topic encompasses various techniques, themes, and approaches that have shaped the art of filmmaking.`,
      },
      {
        type: 'text',
        content: `To fully appreciate ${topic}, it's helpful to examine how different directors and movements have approached this concept throughout film history. The evolution of these ideas reflects broader changes in society, technology, and artistic expression.`,
      },
    ],
    movies: [
      {
        title: 'Citizen Kane',
        year: 1941,
        slug: 'Foundational cinema techniques',
        streaming: 'Free on Archive.org',
      },
      {
        title: 'Vertigo',
        year: 1958,
        slug: 'Masterclass in visual storytelling',
        streaming: 'Free on Kanopy',
      },
      {
        title: 'The Godfather',
        year: 1972,
        slug: 'Influential narrative structure',
        streaming: 'Rent on Prime Video',
      },
    ],
    nextSteps: [
      'Explore related filmmaking techniques',
      'Study influential directors in this area',
      'Watch recommended films chronologically',
    ],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * API handler for generating static explore pages
 */
async function generateExplorePageHandler(req, res) {
  if (req.method !== 'POST') {
    throw ApiErrors.BAD_REQUEST('Only POST method is allowed');
  }

  validateRequiredFields(req.body, ['topic']);
  const { topic, context = '' } = req.body;

  try {
    const pageContent = await generateExplorePage(topic, context);

    const response = successResponse(pageContent, 'Explore page generated successfully');

    // Cache the response for 24 hours
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    res.status(200).json(response);
  } catch (error) {
    console.error('Explore page generation error:', error);

    if (error.name === 'ApiError') {
      throw error;
    }

    throw ApiErrors.INTERNAL_ERROR(`Failed to generate explore page: ${error.message}`);
  }
}

export default withErrorHandling(generateExplorePageHandler);
