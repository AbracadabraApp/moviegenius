/**
 * Genius Topics API for Query Detection
 *
 * Provides structured list of all genius themes, series, and episodes
 * for topic matching in query detection system
 *
 * Returns flattened list with metadata for efficient matching
 */

import { getCache } from '../../lib/cache.js';
import { withErrorHandling, successResponse } from '../../lib/api-utils.js';

async function geniusTopicsHandler(req, res) {
  const cache = getCache();

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use cache for genius topics with 6-hour TTL
    const topics = await cache.cacheAside(
      'genius_topics_structured',
      async () => {
        return await loadAndStructureGeniusTopics();
      },
      6 * 60 * 60 // 6 hours
    );

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=21600, stale-while-revalidate=43200'); // 6 hours

    return successResponse(res, topics);
  } catch (error) {
    console.error('Error loading genius topics:', error);
    return res.status(500).json({
      error: 'Failed to load genius topics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * Load and structure genius configuration for topic detection
 */
async function loadAndStructureGeniusTopics() {
  try {
    // Load genius configuration
    const fs = require('fs').promises;
    const path = require('path');

    const configPath = path.join(process.cwd(), 'data', 'genius-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);

    const topics = [];

    // Process each theme
    for (const theme of config.themes) {
      // Add theme-level entry
      topics.push({
        type: 'theme',
        id: theme.id,
        title: theme.title,
        description: theme.description,
        url: `/genius/${theme.id}`,
        keywords: extractKeywords(theme.title + ' ' + theme.description),
        level: 'theme',
      });

      // Process each series in theme
      for (const series of theme.series) {
        // Add series-level entry
        topics.push({
          type: 'series',
          id: `${theme.id}-${series.id}`,
          themeId: theme.id,
          seriesId: series.id,
          title: series.title,
          subtitle: series.subtitle,
          description: series.description,
          url: `/genius/${theme.id}/${series.id}`,
          keywords: extractKeywords(
            series.title + ' ' + series.subtitle + ' ' + series.description
          ),
          level: 'series',
          episodeCount: series.episodes.length,
        });

        // Process each episode in series
        for (const episode of series.episodes) {
          topics.push({
            type: 'episode',
            id: `${theme.id}-${series.id}-${episode.id}`,
            themeId: theme.id,
            seriesId: series.id,
            episodeId: episode.id,
            title: episode.title,
            subtitle: episode.subtitle,
            description: episode.description || '',
            url: `/genius/${theme.id}/${series.id}/${episode.id}`,
            keywords: extractKeywords(
              episode.title + ' ' + episode.subtitle + ' ' + (episode.description || '')
            ),
            level: 'episode',
            seriesTitle: series.title,
          });
        }
      }
    }

    console.log(`✅ Loaded ${topics.length} genius topics for detection`);
    return topics;
  } catch (error) {
    console.error('Error loading genius config:', error);
    throw error;
  }
}

/**
 * Extract searchable keywords from text
 */
function extractKeywords(text) {
  if (!text) return [];

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 2)
    .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
}

// Apply error handling middleware
export default withErrorHandling(geniusTopicsHandler);
