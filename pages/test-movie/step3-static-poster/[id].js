// BATCH 1 - STEP 3: Static Movie Posters + Debug Overlay
export default function Step3StaticPosterPage({ tmdbId, title, year, posterUrl, debugInfo }) {
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
        <div>🚨 STEP 3 DEBUG: Static Poster Movie {tmdbId}</div>
        <div>Title: {title || 'none'}</div>
        <div>Year: {year || 'none'}</div>
        <div>Poster: {posterUrl ? 'present' : 'missing'}</div>
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
        
        {posterUrl && (
          <div style={{ marginBottom: '20px' }}>
            <img 
              src={posterUrl}
              alt={`${title} poster`}
              style={{
                maxWidth: '200px',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                console.log('🚨 Poster image failed to load:', posterUrl);
              }}
              onLoad={() => {
                console.log('✅ Poster image loaded successfully:', posterUrl);
              }}
            />
          </div>
        )}
        
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
          ✅ Step 3: Static movie poster and title rendered successfully
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps({ params }) {
  const startTime = Date.now();
  const debugInfo = {
    timestamp: new Date().toISOString(),
    step: 'step3-static-poster',
    params,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME || null,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    },
    steps: ['Started getStaticProps for step3-static-poster'],
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
        posterUrl: null,
        debugInfo 
      } 
    };
  }

  debugInfo.steps.push(`Parsed tmdbId: ${tmdbId}`);

  // Static movie data with poster URLs - hardcoded for testing
  let title, year, posterUrl;
  switch (tmdbId) {
    case 11:
      title = 'Star Wars';
      year = '1977';
      posterUrl = 'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg';
      break;
    case 550:
      title = 'Fight Club';
      year = '1999';
      posterUrl = 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg';
      break;
    case 238:
      title = 'The Godfather';
      year = '1972';
      posterUrl = 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg';
      break;
    default:
      title = `Test Movie ${tmdbId}`;
      year = '2024';
      posterUrl = 'https://via.placeholder.com/500x750/cccccc/666666?text=Test+Movie';
  }

  debugInfo.steps.push(`Resolved static data: ${title} (${year})`);
  debugInfo.steps.push(`Poster URL: ${posterUrl}`);
  debugInfo.timings.total = Date.now() - startTime;

  return {
    props: {
      tmdbId,
      title,
      year,
      posterUrl,
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