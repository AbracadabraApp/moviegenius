// Simple environment variable test
export default function handler(req, res) {
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        preview: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
        isJWT: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false
      },
      NEXT_PUBLIC_TMDB_API_KEY: {
        exists: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
        length: process.env.NEXT_PUBLIC_TMDB_API_KEY?.length || 0
      },
      ANTHROPIC_API_KEY: {
        exists: !!process.env.ANTHROPIC_API_KEY,
        length: process.env.ANTHROPIC_API_KEY?.length || 0
      }
    }
  };

  res.status(200).json(envCheck);
}