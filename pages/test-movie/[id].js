// Minimal movie test page - just header, no chrome/navigation
import { useRouter } from 'next/router';

export default function TestMoviePage({ title, year, tmdbId, error }) {
  const router = useRouter();
  
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Large Movie Header - No other content */}
      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        padding: '40px'
      }}>
        
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#000',
          margin: '0 0 20px 0',
          lineHeight: '1.1'
        }}>
          {title || `Movie ${tmdbId}`}
        </h1>
        
        {year && (
          <h2 style={{
            fontSize: '2rem',
            color: '#666',
            margin: '0',
            fontWeight: 'normal'
          }}>
            ({year})
          </h2>
        )}
        
        {error && (
          <div style={{
            marginTop: '30px',
            color: '#c00',
            fontSize: '1.2rem'
          }}>
            Error: {error}
          </div>
        )}
        
      </div>
      
    </div>
  );
}

export async function getStaticPaths() {
  return {
    paths: [
      { params: { id: '11' } }, // Star Wars
      { params: { id: '550' } }  // Fight Club
    ],
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  const { id } = params;
  
  try {
    // Use proper TMDB authentication - server-side API key only
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    
    if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('placehol')) {
      throw new Error('No valid TMDB API key configured');
    }
    
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`
    );
    
    if (tmdbResponse.ok) {
      const tmdbData = await tmdbResponse.json();
      
      return {
        props: {
          title: tmdbData.title,
          year: tmdbData.release_date ? parseInt(tmdbData.release_date.substring(0, 4)) : null,
          tmdbId: parseInt(id),
          error: null
        },
        revalidate: 86400
      };
    }
    
    // Fallback for failed TMDB call
    throw new Error(`TMDB API failed: ${tmdbResponse.status}`);
    
  } catch (error) {
    console.error('Test movie page error:', error);
    
    // Return basic fallback data
    return {
      props: {
        title: id === '11' ? 'Star Wars' : id === '550' ? 'Fight Club' : `Movie ${id}`,
        year: id === '11' ? 1977 : id === '550' ? 1999 : null,
        tmdbId: parseInt(id),
        error: error.message
      }
    };
  }
}