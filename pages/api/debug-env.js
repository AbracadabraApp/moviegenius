/**
 * Debug Environment Variables
 * 
 * Quick endpoint to check if environment variables are loaded
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return res.status(200).json({
      success: true,
      has_railway_token: !!process.env.RAILWAY_BATCH_TOKEN,
      deployment_check: 'v2',
      token_length: process.env.RAILWAY_BATCH_TOKEN ? process.env.RAILWAY_BATCH_TOKEN.length : 0,
      token_preview: process.env.RAILWAY_BATCH_TOKEN ? 
        process.env.RAILWAY_BATCH_TOKEN.substring(0, 10) + '...' : 'not found',
      has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
      has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      all_env_keys: Object.keys(process.env).filter(key => 
        key.includes('RAILWAY') || 
        key.includes('ANTHROPIC') || 
        key.includes('SUPABASE')
      )
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}