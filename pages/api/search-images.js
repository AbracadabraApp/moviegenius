// API endpoint for searching alternative image sources
import { ImageSourceManager, configureImageSources } from '../../lib/image-sources';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { episode } = req.body;

    if (!episode) {
      return res.status(400).json({ error: 'Episode data required' });
    }

    // Check API configuration
    const config = configureImageSources();
    
    if (!config.unsplashEnabled && !config.pexelsEnabled && !config.tmdbEnabled) {
      return res.status(503).json({ 
        error: 'No image sources configured',
        message: 'Please add API keys to your .env file',
        missing: config.missing
      });
    }

    // Initialize image source manager
    const manager = new ImageSourceManager();

    // Search for images
    const results = await manager.findEpisodeImages(episode, {
      unsplash: { perPage: 8 },
      pexels: { perPage: 8 },
      tmdb: { limit: 6 }
    });

    // Add configuration info to response
    results.config = config;
    results.searchInfo = {
      episodeTitle: episode.episode?.title,
      seriesTitle: episode.series?.title,
      themeTitle: episode.theme?.title,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(results);

  } catch (error) {
    console.error('Image search API error:', error);
    
    // Return specific error messages for common issues
    if (error.message.includes('access key')) {
      return res.status(401).json({
        error: 'API authentication failed',
        message: 'Check your Unsplash/Pexels API keys'
      });
    }

    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    return res.status(500).json({
      error: 'Image search failed',
      message: error.message
    });
  }
}

// Example usage in the API response:
/*
{
  "unsplash": [
    {
      "id": "abc123",
      "url": "https://images.unsplash.com/photo-...",
      "downloadUrl": "https://images.unsplash.com/photo-...-raw",
      "description": "Dramatic film noir lighting",
      "photographer": "John Doe",
      "aspectRatio": 2.1,
      "suitable2to1": true,
      "source": "unsplash"
    }
  ],
  "pexels": [...],
  "tmdb": [...],
  "total": 24,
  "suitable2to1": [
    // Images with aspect ratios close to 2:1
  ],
  "config": {
    "unsplashEnabled": true,
    "pexelsEnabled": true,
    "tmdbEnabled": true
  }
}
*/