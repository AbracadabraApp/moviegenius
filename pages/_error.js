// pages/_error.js
function Error({ statusCode, hasGetInitialPropsRun, err, req, res }) {
  const errorDetails = {
    statusCode,
    hasGetInitialPropsRun,
    errorMessage: err?.message || 'Unknown error',
    errorStack: err?.stack || 'No stack trace',
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side',
    url: typeof window !== 'undefined' ? window.location.href : req?.url || 'Unknown URL',
    method: req?.method || 'Unknown method',
    headers: req?.headers || {},
    query: req?.query || {},
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasTmdbKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>Error {statusCode} - Detailed Debug Info</h1>
      <pre style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', fontSize: '12px', overflow: 'auto' }}>
        {JSON.stringify(errorDetails, null, 2)}
      </pre>
    </div>
  );
}

Error.getInitialProps = ({ res, err, req }) => {
  const statusCode = res?.statusCode || err?.statusCode || 404;
  
  // Log detailed error info on server
  if (typeof window === 'undefined') {
    console.error('🚨 ERROR PAGE TRIGGERED:', {
      statusCode,
      url: req?.url,
      method: req?.method,
      userAgent: req?.headers?.['user-agent'],
      error: err ? {
        message: err.message,
        stack: err.stack,
        name: err.name
      } : null,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasTmdbKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
      }
    });
  }
  
  return { 
    statusCode,
    hasGetInitialPropsRun: true,
    err: err ? {
      message: err.message,
      stack: err.stack,
      name: err.name
    } : null,
    req: req ? {
      url: req.url,
      method: req.method,
      query: req.query,
      headers: Object.keys(req.headers || {}).reduce((acc, key) => {
        // Don't log sensitive headers
        if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
          acc[key] = req.headers[key];
        }
        return acc;
      }, {})
    } : null
  };
};

export default Error;
