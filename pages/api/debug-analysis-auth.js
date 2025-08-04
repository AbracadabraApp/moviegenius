/**
 * Debug endpoint to verify analysis authentication in production
 * (Mirror of debug approach that revealed search authentication issues)
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test 1: Check raw environment variables (like we did for TMDB)
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          (process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ? 'PLACEHOLDER!' : 'Real URL') : 
          'MISSING',
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
          (process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder') ? 'PLACEHOLDER!' : 'Real Key') : 
          'MISSING',
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      },
      ANTHROPIC_API_KEY: {
        present: !!process.env.ANTHROPIC_API_KEY,
        value: process.env.ANTHROPIC_API_KEY ? 
          (process.env.ANTHROPIC_API_KEY.includes('placeholder') ? 'PLACEHOLDER!' : 'Real Key') : 
          'MISSING',
        length: process.env.ANTHROPIC_API_KEY?.length || 0
      }
    };

    // Test 2: Simulate analysis endpoint initialization (like explore/[...slug].js)
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const initializationCheck = {
      resolvedSupabaseUrl: supabaseUrl,
      resolvedSupabaseKey: supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'NULL',
      isUsingPlaceholderURL: supabaseUrl ? supabaseUrl.includes('placeholder') : false,
      isUsingPlaceholderKey: supabaseKey ? supabaseKey.includes('placeholder') : false
    };

    // Test 3: Try to create Supabase client (like analysis endpoints do)
    let supabaseConnectionTest = 'NOT_TESTED';
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try a simple query to test connection
      const { data, error } = await supabase
        .from('movie_analysis')
        .select('count')
        .limit(1);
        
      if (error) {
        supabaseConnectionTest = `ERROR: ${error.message}`;
      } else {
        supabaseConnectionTest = 'SUCCESS';
      }
    } catch (connError) {
      supabaseConnectionTest = `CONNECTION_FAILED: ${connError.message}`;
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      ipv4_addon_status: "ENABLED - Testing connectivity",
      environment_variables: envCheck,
      initialization: initializationCheck,
      supabase_connection_test: supabaseConnectionTest,
      analysis: {
        placeholder_urls_found: supabaseUrl ? supabaseUrl.includes('placeholder') : false,
        placeholder_keys_found: supabaseKey ? supabaseKey.includes('placeholder') : false,
        ready_for_analysis: supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder') && !supabaseKey.includes('placeholder')
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}