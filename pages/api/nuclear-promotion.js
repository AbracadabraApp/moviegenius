// pages/api/nuclear-promotion.js
/**
 * Nuclear Promotion API Endpoint
 *
 * Handles nuclear promotion flagging for movies discovered through search, entity linking, etc.
 * Provides browser-safe access to server-side nuclear promotion functionality.
 */

import { flagForNuclearPromotion } from '../../lib/services/nuclear-promotion';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  const { tmdbId, source, metadata } = req.body;

  // Validate required parameters
  if (!tmdbId) {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'tmdbId is required'
    });
  }

  if (!source) {
    return res.status(400).json({
      error: 'Missing required parameter', 
      message: 'source is required'
    });
  }

  try {
    // Call the server-side nuclear promotion service
    await flagForNuclearPromotion(tmdbId, source, metadata || {});

    return res.status(200).json({
      success: true,
      message: 'Nuclear promotion flagged successfully',
      tmdbId,
      source
    });

  } catch (error) {
    console.error('Nuclear promotion API error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to flag for nuclear promotion',
      details: error.message
    });
  }
}