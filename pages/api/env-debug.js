// Environment variable diagnostic endpoint
export default async function handler(req, res) {
  try {
  const env = {
    // TMDB environment variables
    TMDB_API_KEY: {
      exists: !!process.env.TMDB_API_KEY,
      length: process.env.TMDB_API_KEY?.length || 0,
      firstChars: process.env.TMDB_API_KEY?.substring(0, 8) || 'none'
    },
    NEXT_PUBLIC_TMDB_API_KEY: {
      exists: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      length: process.env.NEXT_PUBLIC_TMDB_API_KEY?.length || 0,
      firstChars: process.env.NEXT_PUBLIC_TMDB_API_KEY?.substring(0, 8) || 'none'
    },
    TMDB_BEARER_TOKEN: {
      exists: !!process.env.TMDB_BEARER_TOKEN,
      length: process.env.TMDB_BEARER_TOKEN?.length || 0,
      firstChars: process.env.TMDB_BEARER_TOKEN?.substring(0, 20) || 'none'
    },
    
    // Supabase environment variables
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }
  };

  // Test which API key would be used
  const selectedApiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  
  return res.json({
    environment: env,
    selectedApiKey: {
      source: process.env.TMDB_API_KEY ? 'TMDB_API_KEY' : 'NEXT_PUBLIC_TMDB_API_KEY',
      exists: !!selectedApiKey,
      length: selectedApiKey?.length || 0,
      firstChars: selectedApiKey?.substring(0, 8) || 'none'
    },
    timestamp: new Date().toISOString()
  });
  } catch (error) {
    console.error('Railway database error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}