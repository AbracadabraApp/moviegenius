// pages/api/debug-env.js - Debug environment variables
export default async function handler(req, res) {
  const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  
  return res.status(200).json({
    hasNextPublicTmdbKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
    hasTmdbKey: !!process.env.TMDB_API_KEY,
    tmdbKeyLength: tmdbKey ? tmdbKey.length : 0,
    tmdbKeyPrefix: tmdbKey ? tmdbKey.substring(0, 8) + '...' : 'none',
    nodeEnv: process.env.NODE_ENV
  });
}