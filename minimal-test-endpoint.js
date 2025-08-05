// Copy this to moviegenius-minimal/pages/api/db-test.js
// Minimal database connectivity test - no movie queries

export default async function handler(req, res) {
  try {
    console.log('Testing Supabase connectivity...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('URL length:', supabaseUrl?.length);
    console.log('Key length:', supabaseKey?.length);

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
    }

    // Test 1: Basic REST API health check
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    console.log('Health check status:', healthResponse.status);

    if (!healthResponse.ok) {
      return res.status(500).json({ 
        error: 'Supabase health check failed',
        status: healthResponse.status,
        statusText: healthResponse.statusText
      });
    }

    // Test 2: Simple count query (minimal data)
    const countResponse = await fetch(`${supabaseUrl}/rest/v1/movies?select=count&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Count query status:', countResponse.status);

    if (!countResponse.ok) {
      return res.status(500).json({ 
        error: 'Supabase count query failed',
        status: countResponse.status,
        statusText: countResponse.statusText
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connectivity working!',
      healthStatus: healthResponse.status,
      countStatus: countResponse.status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Connectivity test error:', error);
    return res.status(500).json({ 
      error: 'Connectivity test failed',
      details: error.message,
      type: error.constructor.name
    });
  }
}