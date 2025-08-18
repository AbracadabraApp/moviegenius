// BATCH 1 - STEP 1: Hello World + Debug Overlay
export default function Step1HelloPage({ tmdbId, debugInfo }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Debug overlay - always visible */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        right: '10px',
        backgroundColor: '#000',
        color: '#00ff00',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '10px',
        zIndex: 9999,
        maxHeight: '200px',
        overflow: 'auto',
        fontFamily: 'monospace'
      }}>
        <div>🚨 STEP 1 DEBUG: Hello World Movie {tmdbId}</div>
        <div>Env: {debugInfo?.environment?.NODE_ENV || 'unknown'}</div>
        <div>Railway: {debugInfo?.environment?.RAILWAY_ENVIRONMENT_NAME || 'none'}</div>
        <div>Steps: {debugInfo?.steps?.length || 0}</div>
        <div>Errors: {debugInfo?.errors?.length || 0}</div>
        <div>Time: {new Date().toLocaleTimeString()}</div>
        <div>Supabase: {debugInfo?.environment?.NEXT_PUBLIC_SUPABASE_URL || 'missing'}</div>
      </div>

      {/* Main content */}
      <div style={{
        padding: '80px 20px 20px', // Top padding for debug overlay
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>
          Hello World Movie Page
        </h1>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Movie ID: <strong>{tmdbId}</strong>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Rendered at: {new Date().toISOString()}
        </div>
        <div style={{ 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          padding: '15px', 
          borderRadius: '5px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          ✅ Step 1: Basic Hello World page rendered successfully
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const startTime = Date.now();
  const debugInfo = {
    timestamp: new Date().toISOString(),
    step: 'step1-hello',
    params,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME || null,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    },
    steps: ['Started getStaticProps for step1-hello'],
    errors: [],
    timings: {}
  };

  const { id } = params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    debugInfo.errors.push(`Invalid movie ID: ${id} -> ${tmdbId}`);
    return { 
      props: { 
        tmdbId: id,
        debugInfo 
      } 
    };
  }

  debugInfo.steps.push(`Parsed tmdbId: ${tmdbId}`);
  debugInfo.timings.total = Date.now() - startTime;

  return {
    props: {
      tmdbId,
      debugInfo
    }
  };
}

export async function getStaticPaths() {
  return {
    paths: [
      { params: { id: '11' } },   // Star Wars
      { params: { id: '550' } },  // Fight Club  
      { params: { id: '238' } }   // Godfather
    ],
    fallback: false
  };
}