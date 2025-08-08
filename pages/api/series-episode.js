/**
 * Series Episode API Route
 *
 * Generates series episode content using Claude AI following the ask-claude pattern.
 * Returns same data structure as ask-claude for consistency.
 */

// Import series configuration
import { createClient, supabase } from '../lib/railway-adapter.js';

import fs from 'fs';
import path from 'path';

// Import modular prompt system
import { CORE_VOICE } from '../../lib/prompts/core.js';
import { GENIUS_CONTEXT } from '../../lib/prompts/contexts.js';

// Load series data from static configuration file
function loadSeriesData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'series-config.json');

    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error('Series config file not found:', filePath);
      return getFallbackSeriesData();
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Validate JSON structure
    const seriesData = JSON.parse(fileContent);

    // Basic validation - ensure it's an object with at least one series
    if (!seriesData || typeof seriesData !== 'object' || Object.keys(seriesData).length === 0) {
      console.error('Invalid series config structure');
      return getFallbackSeriesData();
    }

    console.log(`Loaded ${Object.keys(seriesData).length} series from config`);
    return seriesData;
  } catch (error) {
    console.error('Error loading series config:', error.message);
    return getFallbackSeriesData();
  }
}

// Fallback series data to prevent loops
function getFallbackSeriesData() {
  return {
    2: {
      id: 2,
      title: 'Cinema Through Time - 1970-2025',
      description: 'How film evolved from the auteur renaissance through the present day',
      episodes: [
        {
          id: 1,
          title: '1970s: The Auteur Renaissance',
          subtitle: 'When directors became superstars',
          posters: [
            'https://image.tmdb.org/t/p/w200/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
            'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
          ],
        },
      ],
    },
  };
}

// Simplified movie data processing for testing
function processMovieData(movieData) {
  return {
    title: movieData.title,
    year: movieData.year,
    slug: movieData.slug,
    poster_url: null, // Will be enhanced later
    tmdb_id: null, // Will be enhanced later
    streaming: null, // Will be enhanced later
  };
}

// Load episode content from database (with file system fallback)
async function loadEpisodeContent(seriesId, episodeId) {
  try {
    // First try database for Genius episodes (theme determined by series mapping)
    const { EpisodeService } = await import('../../lib/railway-db.js');

    // Map series ID to theme ID (this mapping should match your genius-config.json)
    const seriesThemeMapping = {
      1: { themeId: 1, seriesId: 1 }, // Classic Film Noir
      2: { themeId: 1, seriesId: 2 }, // Suspense & Horror
      3: { themeId: 1, seriesId: 3 }, // Comedy Through the Ages
      4: { themeId: 2, seriesId: 1 }, // Women Directors
      5: { themeId: 2, seriesId: 2 }, // International Masters
      // Add more mappings as needed
    };

    const mapping = seriesThemeMapping[seriesId];
    if (mapping) {
      const episodeData = await EpisodeService.getEpisode(
        mapping.themeId,
        mapping.seriesId,
        parseInt(episodeId)
      );
      if (episodeData) {
        console.log(
          `Loaded episode content from database: theme ${mapping.themeId}, series ${mapping.seriesId}, episode ${episodeId}`
        );
        return episodeData.content;
      }
    }

    // Fallback to legacy file system for non-Genius episodes
    const episodePath = path.join(
      process.cwd(),
      'data',
      'episodes',
      `series-${seriesId}-episode-${episodeId}.json`
    );

    if (fs.existsSync(episodePath)) {
      const episodeContent = fs.readFileSync(episodePath, 'utf8');
      const episodeData = JSON.parse(episodeContent);
      console.log(
        `Loaded episode content from file system: series ${seriesId}, episode ${episodeId}`
      );
      return episodeData.content;
    } else {
      console.log(
        `Episode content not found in database or file system: series ${seriesId}, episode ${episodeId}`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `Error loading episode content for Series ${seriesId}, Episode ${episodeId}:`,
      error
    );

    // Final fallback to file system
    try {
      const episodePath = path.join(
        process.cwd(),
        'data',
        'episodes',
        `series-${seriesId}-episode-${episodeId}.json`
      );

      if (fs.existsSync(episodePath)) {
        const episodeContent = fs.readFileSync(episodePath, 'utf8');
        const episodeData = JSON.parse(episodeContent);
        console.log(
          `Loaded episode content from file system as error fallback: series ${seriesId}, episode ${episodeId}`
        );
        return episodeData.content;
      }
    } catch (fallbackError) {
      console.error(
        `File system fallback also failed for series ${seriesId}, episode ${episodeId}:`,
        fallbackError
      );
    }

    return null;
  }
}

// Generate episode content on-demand using Claude AI
async function generateEpisodeContentFallback(
  seriesId,
  episodeId,
  customTopic = null,
  customContext = null
) {
  console.log(`Generating content for Series ${seriesId}, Episode ${episodeId}`);

  // Get episode metadata for prompt
  const seriesData = loadSeriesData();
  const series = seriesData[seriesId];
  const episode = series?.episodes.find(ep => ep.id.toString() === episodeId);

  if (!series || !episode) {
    throw new Error('Series or episode not found');
  }

  // Use custom topic/context if provided, otherwise use series metadata
  const topicTitle = customTopic || `${episode.title}: ${episode.subtitle}`;
  const contextDescription = customContext || `Part of ${series.title} series`;

  console.log('Topic Title:', topicTitle);
  console.log('Context Description:', contextDescription);

  try {
    // Import and use Anthropic API
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 6000,
      temperature: 0.7,
      system: [
        {
          type: 'text',
          text: `${CORE_VOICE}

${GENIUS_CONTEXT.structure}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Create comprehensive educational content for "${topicTitle}".

${contextDescription ? `Context: ${contextDescription}` : ''}

CRITICAL LENGTH REQUIREMENTS:
- Write NO LESS THAN 1200 words of PARAGRAPH content (this is MANDATORY)
- Write exactly 10 substantial paragraphs of 120-150 words EACH
- Each paragraph should be a mini-essay with rich detail and specific examples
- Treat this as a university-level documentary script - be thorough and comprehensive
- Do NOT write brief summaries - write detailed, expansive analysis
- Include extensive discussion of specific films, directors, and techniques throughout

This is a comprehensive educational piece requiring substantial depth and length.`,
        },
      ],
    });

    const responseText = response.content[0].text;
    return parseClaudeResponse(responseText);
  } catch (error) {
    console.error('Error generating episode content:', error);

    // Return more robust fallback content
    const fallbackTitle = customTopic || episode.title;
    const fallbackContext = customContext || `${series.title.toLowerCase()}`;

    return {
      opener: `${fallbackTitle} represents a pivotal moment in cinema, showcasing the evolution of cinematic artistry and storytelling.`,
      sections: [
        {
          type: 'text',
          content: `This episode explores "${fallbackTitle}" within the context of ${fallbackContext}. This content examines the historical context, artistic innovations, and lasting impact of this important aspect of cinema history.`,
        },
        {
          type: 'text',
          content: `The films from this tradition demonstrate significant technological and narrative advances that continue to influence modern filmmaking. Directors and cinematographers working in this style pushed creative boundaries while establishing new cinematic languages.`,
        },
        {
          type: 'text',
          content: `Cultural impact extended far beyond the box office, as these works reflected and shaped societal values. The legacy of this cinematic tradition continues to inform contemporary cinema and inspire new generations of filmmakers.`,
        },
      ],
      moreIdeas: {
        title: 'Related Films to Explore',
        movies: [],
      },
    };
  }
}

// Copy the parseClaudeResponse function from ask-claude.js
function parseClaudeResponse(responseText) {
  const sections = [];
  const moreIdeasMovies = [];
  let opener = null;

  const lines = responseText.split('\n');
  let currentSection = null;
  let currentMovies = [];
  let inMoreIdeas = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    if (trimmedLine.startsWith('OPENER:')) {
      opener = trimmedLine.substring('OPENER:'.length).trim();
    } else if (trimmedLine.startsWith('SUBHEAD:')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection,
        });

        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies,
          });
          currentMovies = [];
        }
      }

      // Add subhead
      sections.push({
        type: 'subhead',
        content: trimmedLine.substring('SUBHEAD:'.length).trim(),
      });
      currentSection = null;
    } else if (trimmedLine.startsWith('PARAGRAPH:')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection,
        });

        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies,
          });
          currentMovies = [];
        }
      }

      // Start new section
      currentSection = trimmedLine.substring('PARAGRAPH:'.length).trim();
    } else if (trimmedLine.startsWith('MOVIES:') && !inMoreIdeas) {
      const movieData = trimmedLine.substring('MOVIES:'.length).trim();
      const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());

      if (title && year) {
        currentMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          streaming: streaming || '',
        });
      }
    } else if (trimmedLine.startsWith('MORE_IDEAS:')) {
      inMoreIdeas = true;

      // Save any pending section
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection,
        });
        currentSection = null;

        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies,
          });
          currentMovies = [];
        }
      }

      const movieData = trimmedLine.substring('MORE_IDEAS:'.length).trim();
      const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());

      if (title && year) {
        moreIdeasMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          streaming: streaming || '',
        });
      }
    }
  }

  // Save final section
  if (currentSection) {
    sections.push({
      type: 'text',
      content: currentSection,
    });

    if (currentMovies.length > 0) {
      sections.push({
        type: 'movies',
        movies: currentMovies,
      });
    }
  }

  return {
    opener,
    sections,
    moreIdeas: {
      title: 'More Ideas',
      movies: moreIdeasMovies,
    },
  };
}

// Check if episode content is locked (database-first with file fallback)
async function checkEpisodeLock(seriesId, episodeId, forceRegenerate = false) {
  try {
    // First try database
    const { EpisodeService } = await import('../../lib/railway-db.js');

    // Map series ID to theme ID
    const seriesThemeMapping = {
      1: { themeId: 1, seriesId: 1 }, // Classic Film Noir
      2: { themeId: 1, seriesId: 2 }, // Suspense & Horror
      3: { themeId: 1, seriesId: 3 }, // Comedy Through the Ages
      4: { themeId: 2, seriesId: 1 }, // Women Directors
      5: { themeId: 2, seriesId: 2 }, // International Masters
    };

    const mapping = seriesThemeMapping[seriesId];
    if (mapping) {
      const episodeData = await EpisodeService.getEpisode(
        mapping.themeId,
        mapping.seriesId,
        parseInt(episodeId)
      );
      if (episodeData && episodeData.locked && !forceRegenerate) {
        return {
          isLocked: true,
          lockedAt: episodeData.locked_at,
          lockedBy: episodeData.locked_by || 'system',
        };
      }
    }

    // Fallback to file system check
    const episodePath = path.join(
      process.cwd(),
      'data',
      'episodes',
      `genius-${seriesId}-${seriesId}-${episodeId}.json`
    );

    if (fs.existsSync(episodePath)) {
      const episodeContent = fs.readFileSync(episodePath, 'utf8');
      const episodeData = JSON.parse(episodeContent);

      if (episodeData.locked && !forceRegenerate) {
        return {
          isLocked: true,
          lockedAt: episodeData.lockedAt,
          lockedBy: episodeData.lockedBy || 'system',
        };
      }
    }

    return { isLocked: false };
  } catch (error) {
    console.error('Error checking episode lock:', error);
    return { isLocked: false };
  }
}

export default async function handler(req, res) {
  // Handle GET request for getAllSeries action
  if (req.method === 'GET' && req.query.action === 'getAllSeries') {
    try {
      const seriesData = loadSeriesData();
      return res.status(200).json(seriesData);
    } catch (error) {
      console.error('Error getting all series:', error);
      return res.status(500).json({ error: 'Failed to load series data' });
    }
  }

  // Handle POST request for episode content
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only GET and POST methods allowed' });
  }

  const { seriesId, episodeId, forceRegenerate = false, topic, context } = req.body;

  // Basic validation
  if (!seriesId || !episodeId) {
    return res.status(400).json({
      error: 'Missing required fields: seriesId and episodeId',
    });
  }

  // Check if episode is locked (only for new generation, not topic/context based generation)
  if (topic && context) {
    const lockStatus = await checkEpisodeLock(seriesId, episodeId, forceRegenerate);
    if (lockStatus.isLocked) {
      console.log(`Episode ${seriesId}-${seriesId}-${episodeId} is locked, blocking regeneration`);
      return res.status(409).json({
        error: 'Episode content is locked to prevent accidental regeneration',
        lockedAt: lockStatus.lockedAt,
        lockedBy: lockStatus.lockedBy,
        message: 'Use forceRegenerate=true to override this protection',
      });
    }
  }

  try {
    // Get series metadata from static config
    const seriesData = loadSeriesData();
    const series = seriesData[seriesId];
    if (!series) {
      return res.status(404).json({ error: `Series ${seriesId} not found` });
    }

    // Get episode metadata
    const episode = series.episodes.find(ep => ep.id.toString() === episodeId);
    if (!episode) {
      return res
        .status(404)
        .json({ error: `Episode ${episodeId} not found in series ${seriesId}` });
    }

    // If topic and context are provided, generate new content; otherwise try pre-generated content
    let rawContent;
    if (topic && context) {
      // Generate new content based on provided topic/context
      rawContent = await generateEpisodeContentFallback(seriesId, episodeId, topic, context);
    } else {
      // Try to load pre-generated content first (from database or file system)
      rawContent = await loadEpisodeContent(seriesId, episodeId);

      // Fallback to dynamic generation if pre-generated content doesn't exist
      if (!rawContent) {
        rawContent = await generateEpisodeContentFallback(seriesId, episodeId, topic, context);
      }
    }

    // Process movies (simplified for now)
    const processedSections = rawContent.sections.map(section => {
      if (section.type === 'movies') {
        const processedMovies = section.movies.map(movie => processMovieData(movie));
        return { ...section, movies: processedMovies };
      }
      return section;
    });

    // Process more ideas movies
    let processedMoreIdeas = rawContent.moreIdeas;
    if (rawContent.moreIdeas && rawContent.moreIdeas.movies) {
      const processedMoreMovies = rawContent.moreIdeas.movies.map(movie => processMovieData(movie));
      processedMoreIdeas = {
        ...rawContent.moreIdeas,
        movies: processedMoreMovies,
      };
    }

    // Return same structure as ask-claude.js
    return res.status(200).json({
      data: {
        sections: processedSections,
        moreIdeas: processedMoreIdeas,
      },
      series,
      episode,
    });
  } catch (error) {
    console.error('Error in series-episode API:', error);

    return res.status(500).json({
      error: 'Failed to generate episode content',
      details: error.message,
    });
  }
}
