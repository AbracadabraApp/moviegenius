// pages/api/tmdb-debug.js - Debug TMDB environment variables
export default async function handler(req, res) {
  return res.status(200).json({
    env_check: {
      NEXT_PUBLIC_TMDB_API_KEY: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      TMDB_API_KEY: !!process.env.TMDB_API_KEY,
      NEXT_PUBLIC_TMDB_API_KEY_value: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'present' : 'missing',
      TMDB_API_KEY_value: process.env.TMDB_API_KEY ? 'present' : 'missing',
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME || 'not_railway'
    }
  });
}