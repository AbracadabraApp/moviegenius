// BATCH 1 - STEP 2: Static Movie Titles + Debug Overlay
export default function Step2StaticTitlePage({ tmdbId, title, year, debugInfo }) {
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
        <div>🚨 STEP 2 DEBUG: Static Title Movie {tmdbId}</div>
        <div>Title: {title || 'none'}</div>
        <div>Year: {year || 'none'}</div>
        <div>Env: {debugInfo?.environment?.NODE_ENV || 'unknown'}</div>
        <div>Railway: {debugInfo?.environment?.RAILWAY_ENVIRONMENT_NAME || 'none'}</div>
        <div>Steps: {debugInfo?.steps?.length || 0}</div>
        <div>Errors: {debugInfo?.errors?.length || 0}</div>
        <div>Time: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* Main content */}
      <div style={{
        padding: '80px 20px 20px', // Top padding for debug overlay
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>
          {title} ({year})
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
          ✅ Step 2: Static movie title and year rendered successfully
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const startTime = Date.now();
  const debugInfo = {
    timestamp: new Date().toISOString(),
    step: 'step2-static-title',
    params,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME || null,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    },
    steps: ['Started getStaticProps for step2-static-title'],
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
        title: 'Invalid Movie',
        year: 'Unknown',
        debugInfo 
      } 
    };
  }

  debugInfo.steps.push(`Parsed tmdbId: ${tmdbId}`);

  // Static movie data - hardcoded for testing
  let title, year;
  switch (tmdbId) {
    case 11:
      title = 'Star Wars';
      year = '1977';
      break;
    case 550:
      title = 'Fight Club';
      year = '1999';
      break;
    case 238:
      title = 'The Godfather';
      year = '1972';
      break;
    default:
      title = `Test Movie ${tmdbId}`;
      year = '2024';
  }

  debugInfo.steps.push(`Resolved static title: ${title} (${year})`);
  debugInfo.timings.total = Date.now() - startTime;

  return {
    props: {
      tmdbId,
      title,
      year,
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
    fallback: 'blocking'
  };
}