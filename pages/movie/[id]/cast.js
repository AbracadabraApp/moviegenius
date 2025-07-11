// pages/movie/[id]/cast.js - Cast and Crew page for movies
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import PhoneFrame from '../../../components/PhoneFrame';
import MovieHeader from '../../../components/MovieHeader';
import PersonCard from '../../../components/PersonCard';
import SimpleSearch from '../../../components/SimpleSearch';
import { ArrowLeft } from 'lucide-react';

export default function MovieCastPage({ title, year, initialSlug, initialPoster, initialStreaming, tmdbId, error }) {
  const router = useRouter();
  const { id } = router.query;
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [credits, setCredits] = useState(null);

  // Handle search results
  const handleSearchResults = (results) => {
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

  // Handle back navigation
  const handleBack = () => {
    router.push(`/movie/${tmdbId}`);
  };

  useEffect(() => {
    if (!tmdbId) return;

    const fetchCredits = async () => {
      setIsLoadingCredits(true);
      
      try {
        console.log('🎬 Fetching credits for movie ID:', tmdbId);
        
        const response = await fetch('/api/movie-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tmdbId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Movie credits API error:', response.status, errorText);
          throw new Error(`Failed to fetch movie credits: ${response.status}`);
        }

        const data = await response.json();
        setCredits(data);
        console.log('✅ Credits loaded:', data.totals);

      } catch (err) {
        console.error('Error fetching movie credits:', err);
      } finally {
        setIsLoadingCredits(false);
      }
    };

    fetchCredits();
  }, [tmdbId]);


  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Error: {error}</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.inputArea}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>
        
        {/* Back button */}
        <div style={styles.backButton} onClick={handleBack}>
          <ArrowLeft size={20} />
          <span style={styles.backText}>Back to Movie</span>
        </div>
        
        {/* Movie header */}
        <MovieHeader
          title={title}
          year={year}
          initialSlug={initialSlug}
          initialPoster={initialPoster}
          initialStreaming={initialStreaming}
          tmdbId={tmdbId}
        />

        <div style={styles.creditsSection}>
          {isLoadingCredits ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading cast and crew...</div>
            </div>
          ) : credits ? (
            <div style={styles.creditsContent}>
              {/* Director */}
              {credits.directors && credits.directors.length > 0 && (
                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>
                    {credits.directors.length === 1 ? 'Director' : 'Directors'}
                  </h4>
                  <div style={styles.personList}>
                    {credits.directors.map((person) => (
                      <PersonCard
                        key={`director-${person.id}`}
                        name={person.name}
                        initialBiography={person.job}
                        initialProfile={person.profile_path}
                        knownForDepartment={person.job}
                        tmdbId={person.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cast List */}
              {credits.allCast && credits.allCast.length > 0 && (
                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>Cast ({credits.allCast.length})</h4>
                  <div style={styles.textList}>
                    {credits.allCast.map((person) => (
                      <div key={`cast-${person.id}`} style={styles.listItem}>
                        <span style={styles.listName}>{person.name}</span>
                        <span style={styles.listRole}>as {person.character}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Crew List */}
              {credits.otherCrew && Object.keys(credits.otherCrew).length > 0 && (
                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>Crew ({credits.totals.crew})</h4>
                  <div style={styles.textList}>
                    {Object.entries(credits.otherCrew).map(([department, people]) => (
                      <div key={department}>
                        <h5 style={styles.departmentTitle}>{department}</h5>
                        {people.map((person) => (
                          <div key={`${department}-${person.id}`} style={styles.listItem}>
                            <span style={styles.listName}>{person.name}</span>
                            <span style={styles.listRole}>{person.job}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.errorContainer}>
              <div style={styles.errorText}>Failed to load cast and crew information</div>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    cursor: 'pointer',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  backText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500',
  },
  creditsSection: {
    flex: 1,
    padding: '0 16px 24px',
  },
  creditsContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    marginTop: '16px',
  },
  subsection: {
    marginBottom: '24px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  personList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  textList: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '12px',
  },
  departmentTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginTop: '16px',
    marginBottom: '8px',
    paddingLeft: '8px',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '6px 8px',
    borderBottom: '1px solid #f3f4f6',
  },
  listName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  listRole: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginLeft: '8px',
    textAlign: 'right',
    flex: 1,
  },
  loadingContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  errorContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
  },
};

// Server-Side Rendering: Fetch movie data by TMDB ID (same as movie detail page)
export async function getServerSideProps({ params }) {
  const { id } = params;
  
  try {
    const tmdbId = parseInt(id, 10);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      return {
        props: {
          error: 'Invalid movie ID'
        }
      };
    }

    // Create supabase client with fallback
    let supabaseClient;
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
      );
    } catch (error) {
      console.error('Failed to create supabase client:', error);
      return {
        props: {
          error: 'Database connection failed'
        }
      };
    }

    // Query movie from Supabase by TMDB ID
    const { data: movieEntry, error } = await supabaseClient
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (movieEntry && !error) {
      // Movie found in Supabase - return as props
      return {
        props: {
          title: movieEntry.title,
          year: movieEntry.year,
          initialSlug: movieEntry.slug,
          initialPoster: movieEntry.poster_url,
          initialStreaming: movieEntry.streaming_data,
          tmdbId: movieEntry.tmdb_id,
          error: null
        }
      };
    } else {
      // Movie not found
      return {
        props: {
          error: `Movie with ID ${tmdbId} not found`
        }
      };
    }
  } catch (error) {
    console.error('Server-side fetch error:', error);
    
    return {
      props: {
        error: error.message
      }
    };
  }
}