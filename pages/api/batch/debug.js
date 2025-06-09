/**
 * Debug Batch Authentication
 * 
 * Quick endpoint to debug auth token issues
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.RAILWAY_BATCH_TOKEN;
    
    return res.status(200).json({
      success: true,
      debug: {
        has_auth_header: !!authHeader,
        auth_header_preview: authHeader ? authHeader.substring(0, 20) + '...' : 'missing',
        has_env_token: !!expectedToken,
        env_token_preview: expectedToken ? expectedToken.substring(0, 20) + '...' : 'missing',
        env_token_length: expectedToken ? expectedToken.length : 0,
        auth_header_length: authHeader ? authHeader.length : 0,
        tokens_match: authHeader === `Bearer ${expectedToken}`,
        expected_format: `Bearer ${expectedToken ? expectedToken.substring(0, 20) + '...' : 'MISSING'}`,
        received_format: authHeader || 'MISSING'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}