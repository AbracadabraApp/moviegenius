/**
 * Direct environment variable test with no fallbacks or imports
 * Tests if Railway environment variables are actually being set
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Direct access with no fallbacks whatsoever
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    test_name: "Direct Environment Variable Test",
    results: {
      NEXT_PUBLIC_SUPABASE_URL: {
        value: url || "UNDEFINED",
        type: typeof url,
        is_undefined: url === undefined,
        is_null: url === null,
        is_empty_string: url === "",
        exact_match_placeholder: url === "https://placeholder.supabase.co",
        actual_length: url?.length || 0
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        present: !!key,
        type: typeof key,
        is_jwt: key?.startsWith('eyJ') || false,
        length: key?.length || 0
      },
      all_env_vars_sample: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAILWAY_PROJECT_NAME: process.env.RAILWAY_PROJECT_NAME
      }
    }
  });
}