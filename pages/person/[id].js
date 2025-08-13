import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MediaCard from '../../components/MediaCard';
import SimpleSearch from '../../components/SimpleSearch';

export default function PersonDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Convert ID to integer - only accept numeric IDs now
  const personId = id ? parseInt(id) : null;
  const isValidId = personId && !isNaN(personId);

  // State for ID-based person pages
  const [person, setPerson] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch person data using ID
  useEffect(() => {
    if (!isValidId) return;
    
    const fetchPersonById = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/person-movies-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: personId })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch person: ${response.status}`);
        }
        
        const data = await response.json();
        setPerson(data.person || null);
        setMovies(data.movies || []);
        
      } catch (err) {
        console.error('Error fetching person by ID:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersonById();
  }, [isValidId, personId]);

  // Handle search results
  const handleSearchResults = results => {
    // Auto-navigate to single results
    if (results.length === 1) {
      const movie = results[0];
      if (movie.tmdb_id) {
        router.push(`/movie/${movie.tmdb_id}`);
        return;
      }
    }
    // For multiple results, redirect to search page
    if (results.length > 1) {
      router.push('/search');
    }
  };

  // Handle invalid or missing ID
  if (!isValidId) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.searchSection}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Invalid Person ID</div>
            <div style={styles.errorSubtext}>
              Person pages now use numeric IDs like /person/12345
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Handle person not found
  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.searchSection}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Person not found</div>
            <div style={styles.errorSubtext}>
              Person ID {personId} may not exist in our database.
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Main person page
  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search section */}
        <div style={styles.searchSection}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>
        
        {/* Person header */}
        <div style={styles.personHeader}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading person...</div>
            </div>
          ) : person ? (
            <>
              <h1 style={styles.personName}>{person.name}</h1>
              <div style={styles.personStats}>
                {person.roles && person.roles.length > 0 && (
                  <span style={styles.roles}>
                    {person.roles.join(', ')}
                  </span>
                )}
                <span style={styles.movieCount}>
                  {person.movieCount} Movie{person.movieCount !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Movies section */}
        <div style={styles.moviesSection}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading movies...</div>
            </div>
          ) : movies.length === 0 ? (
            <div style={styles.noMoviesContainer}>
              <div style={styles.noMoviesText}>
                No movies found for this person
              </div>
            </div>
          ) : (
            <div style={styles.moviesList}>
              {movies.map((movie, index) => (
                <MediaCard
                  key={`${movie.tmdb_id}-${index}`}
                  title={movie.title}
                  year={movie.year}
                  initialSlug={movie.overview}
                  initialPoster={movie.poster_url}
                  tmdbId={movie.tmdb_id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#ffffff',
  },

  // Search section
  searchSection: {
    padding: '16px',
    backgroundColor: '#ffffff',
  },

  // Clean person header
  personHeader: {
    padding: '14px 20px 2px 20px',
    backgroundColor: '#ffffff',
  },
  
  personName: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0',
    letterSpacing: '-0.02em',
  },
  
  personStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  
  movieCount: {
    fontSize: '17px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  
  roles: {
    fontSize: '17px',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  
  // Movies section
  moviesSection: {
    flex: 1,
    paddingTop: '12px',
  },
  
  moviesList: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Loading and error states
  loadingContainer: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  
  noMoviesContainer: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  
  noMoviesText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '8px',
  },
  
  errorContainer: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: '18px',
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: '8px',
  },
  
  errorSubtext: {
    fontSize: '16px',
    color: '#6b7280',
    marginTop: '8px',
  },
};

// Simplified static props - only handle name-based routing client-side
export async function getStaticProps({ params }) {
  return {
    props: {},
    revalidate: 86400, // 24 hour revalidation
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  };
}