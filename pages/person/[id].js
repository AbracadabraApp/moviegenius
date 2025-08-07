// pages/person/[id].js - TMDB ID based person detail page
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import PhoneFrame from '../../components/PhoneFrame';
import PersonHeader from '../../components/PersonHeader';
import MediaCard from '../../components/MediaCard';
import SimpleSearch from '../../components/SimpleSearch';
import BackButton from '../../components/BackButton';
import { ArrowLeft, Heart, Bookmark } from 'lucide-react';
import { FavoritesManager } from '../../components/FavoritesManager';
import { underlineProperNames } from '../../lib/proper-names';
import loadingMessages from '../../data/loading-messages.json';

export default function PersonDetailPage({
  name,
  birthYear,
  deathYear,
  initialBiography,
  initialProfile,
  knownForDepartment,
  tmdbId,
  error,
}) {
  const router = useRouter();
  const { id } = router.query;
  
  // Detect if this is a name slug (contains non-numeric characters) or TMDB ID (numeric)
  const isNameSlug = id && isNaN(parseInt(id));
  const isTmdbId = id && !isNaN(parseInt(id));
  
  // For name slugs, convert back to person name
  const personNameFromSlug = isNameSlug ? id.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') : null;
  // State for TMDB-based person pages
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const [sections, setSections] = useState([]);
  const [exploreFurther, setExploreFurther] = useState([]);
  const [moreIdeas, setMoreIdeas] = useState(null);
  
  // State for name-based person pages (Phase 1 internal system)
  const [nameBasedMovies, setNameBasedMovies] = useState([]);
  const [nameBasedStats, setNameBasedStats] = useState(null);
  const [nameBasedLoading, setNameBasedLoading] = useState(false);
  const [nameBasedError, setNameBasedError] = useState(null);

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

  // UseEffect for name-based person pages (Phase 1 internal system)
  useEffect(() => {
    if (!isNameSlug || !personNameFromSlug) return;
    
    const fetchNameBasedPersonMovies = async () => {
      setNameBasedLoading(true);
      setNameBasedError(null);
      
      try {
        const response = await fetch('/api/person-movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personName: personNameFromSlug })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch movies: ${response.status}`);
        }
        
        const data = await response.json();
        setNameBasedMovies(data.movies || []);
        setNameBasedStats(data.stats || null);
        
      } catch (err) {
        console.error('Error fetching name-based person movies:', err);
        setNameBasedError(err.message);
      } finally {
        setNameBasedLoading(false);
      }
    };
    
    fetchNameBasedPersonMovies();
  }, [isNameSlug, personNameFromSlug]);

  // UseEffect for TMDB ID-based person pages (existing system)
  useEffect(() => {
    if (!isTmdbId || !name) return;

    const initializeAnalysis = async () => {
      // Reset analysis state when id changes (navigation between people)
      setIsLoadingAnalysis(true);
      setSections([]);
      setExploreFurther([]);
      setMoreIdeas(null);

      // Scroll to top when navigating to new person
      window.scrollTo(0, 0);

      // Start Claude analysis for person content
      await fetchClaudeAnalysis();
    };

    const fetchClaudeAnalysis = async () => {
      let cycleInterval;

      try {
        // Start cycling loading messages and icons
        const iconFiles = [
          'film-movie-reel-icon.png',
          'film-movie-icon.png',
          'chair-director-outline-icon.png',
        ];

        // Set initial message and icon
        const setRandomLoadingContent = () => {
          const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
          const randomIcon = iconFiles[Math.floor(Math.random() * iconFiles.length)];
          setLoadingMessage(randomMessage);
          setLoadingIcon(randomIcon);
        };

        // Set initial content
        setRandomLoadingContent();

        // Cycle every 5 seconds
        cycleInterval = setInterval(setRandomLoadingContent, 5000);

        console.log('🔍 Fetching analysis for:', name, birthYear);

        const requestBody = { name: name, birthYear: birthYear, deathYear: deathYear };
        console.log('Request body:', requestBody);

        const claudeResponse = await fetch('/api/person-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error('Person analysis API error:', claudeResponse.status, errorText);
          throw new Error(
            `Failed to fetch person analysis: ${claudeResponse.status} - ${errorText}`
          );
        }

        const data = await claudeResponse.json();

        // Parse the response like ask page does
        const parsedData = parseClaudeResponse(data.analysis);
        const sections = parsedData.sections || [];
        const exploreFurther = parsedData.exploreFurther || [];
        const moreIdeas = parsedData.moreIdeas || null;

        // Fetch movie data for all movies in sections and moreIdeas
        const fetchMovieData = async sectionsToUpdate => {
          const updatedSections = [];

          for (const section of sectionsToUpdate) {
            if (section.type === 'movies' && section.movies) {
              const updatedMovies = [];
              for (const movie of section.movies) {
                try {
                  const dbResponse = await fetch('/api/lookup-movie', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: movie.title, year: movie.year }),
                  });
                  if (dbResponse.ok) {
                    const dbData = await dbResponse.json();
                    updatedMovies.push({
                      ...movie,
                      poster: dbData.poster_url || movie.poster,
                      tmdb_id: dbData.tmdb_id,
                    });
                  } else {
                    updatedMovies.push(movie);
                  }
                } catch (error) {
                  console.error('Error fetching movie data for', movie.title, error);
                  updatedMovies.push(movie);
                }
              }
              updatedSections.push({ ...section, movies: updatedMovies });
            } else {
              updatedSections.push(section);
            }
          }
          return updatedSections;
        };

        // Fetch movie data for main sections
        const sectionsWithMovieData = await fetchMovieData(sections);
        setSections(sectionsWithMovieData);
        setExploreFurther(exploreFurther);

        // Fetch movie data for moreIdeas
        if (moreIdeas && moreIdeas.movies) {
          try {
            const updatedMoreIdeasMovies = [];
            for (const movie of moreIdeas.movies) {
              try {
                const dbResponse = await fetch('/api/lookup-movie', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: movie.title, year: movie.year }),
                });
                if (dbResponse.ok) {
                  const dbData = await dbResponse.json();
                  updatedMoreIdeasMovies.push({
                    ...movie,
                    poster: dbData.poster_url || movie.poster,
                    tmdb_id: dbData.tmdb_id,
                  });
                } else {
                  updatedMoreIdeasMovies.push(movie);
                }
              } catch (error) {
                console.error('Error fetching movie data for', movie.title, error);
                updatedMoreIdeasMovies.push(movie);
              }
            }
            setMoreIdeas({ ...moreIdeas, movies: updatedMoreIdeasMovies });
          } catch (error) {
            console.error('Error updating more ideas movie data:', error);
            setMoreIdeas(moreIdeas);
          }
        }

        setIsLoadingAnalysis(false);
        clearInterval(cycleInterval);
        console.log('✅ Person analysis complete for:', name);
      } catch (err) {
        console.error('Error fetching person analysis:', err);
        setIsLoadingAnalysis(false);
        if (cycleInterval) {
          clearInterval(cycleInterval);
        }
      }
    };

    initializeAnalysis();
  }, [id, name, birthYear]); // Include name/birthYear in deps

  // Load favorites state when person props are available
  useEffect(() => {
    if (name && birthYear) {
      const personId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${birthYear || 'unknown'}`;
      setHearted(FavoritesManager.isPersonHearted(personId));
      setBookmarked(FavoritesManager.isPersonBookmarked(personId));

      // Listen for favorites updates
      const handlePeopleUpdate = () => {
        setHearted(FavoritesManager.isPersonHearted(personId));
        setBookmarked(FavoritesManager.isPersonBookmarked(personId));
      };

      window.addEventListener('peopleUpdated', handlePeopleUpdate);
      return () => window.removeEventListener('peopleUpdated', handlePeopleUpdate);
    }
  }, [name, birthYear]);

  // Parse Claude's structured response (adapted from movie page)
  function parseClaudeResponse(responseText) {
    const sections = [];
    const moreIdeasMovies = [];
    const exploreFurtherTopics = [];

    const lines = responseText.split('\n');
    let currentSection = null;
    let currentMovies = [];
    let inMoreIdeas = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine) continue; // Skip empty lines

      if (trimmedLine.startsWith('PARAGRAPH:')) {
        // Push previous text section first
        if (currentSection) {
          sections.push(currentSection);
        }
        // Then push any pending movies from previous paragraph
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: [...currentMovies],
          });
          currentMovies = [];
        }
        // Start new text section
        currentSection = {
          type: 'text',
          content: trimmedLine.replace('PARAGRAPH:', '').trim(),
        };
      } else if (trimmedLine.startsWith('MOVIES:')) {
        const movieLine = trimmedLine.replace('MOVIES:', '').trim();

        if (movieLine) {
          const parts = movieLine.split('|');

          if (parts.length >= 2) {
            // At least title and year
            const [title, year, description, streaming] = parts;
            const movieObj = {
              title: title?.trim() || 'Unknown Title',
              year: parseInt(year?.trim()) || new Date().getFullYear(),
              slug: description?.trim() || 'No description available',
              poster: '/images/placeholder-poster.jpg', // Default poster
            };

            currentMovies.push(movieObj);
          }
        }
      } else if (trimmedLine.startsWith('EXPLORE_FURTHER:')) {
        const topic = trimmedLine.replace('EXPLORE_FURTHER:', '').trim();
        if (topic) {
          exploreFurtherTopics.push(topic);
        }
      } else if (trimmedLine.startsWith('MORE_IDEAS:')) {
        inMoreIdeas = true;
        const movieLine = trimmedLine.replace('MORE_IDEAS:', '').trim();
        if (movieLine) {
          const parts = movieLine.split('|');

          const [title, year, description, streaming] = parts;
          const movieObj = {
            title: title?.trim() || 'Unknown Title',
            year: parseInt(year?.trim()) || new Date().getFullYear(),
            slug: description?.trim() || 'No description available',
            poster: '/images/placeholder-poster.jpg', // Default poster
          };

          moreIdeasMovies.push(movieObj);
        }
      } else if (inMoreIdeas && trimmedLine.includes('|')) {
        const parts = trimmedLine.split('|');

        const [title, year, description, streaming] = parts;
        const movieObj = {
          title: title?.trim() || 'Unknown Title',
          year: parseInt(year?.trim()) || new Date().getFullYear(),
          slug: description?.trim() || 'No description available',
          poster: '/images/placeholder-poster.jpg', // Default poster
        };

        moreIdeasMovies.push(movieObj);
      } else if (currentSection && trimmedLine) {
        currentSection.content += ' ' + trimmedLine;
      }
    }

    // Handle final sections - text first, then movies
    if (currentSection) {
      sections.push(currentSection);
    }

    if (currentMovies.length > 0) {
      sections.push({
        type: 'movies',
        movies: [...currentMovies],
      });
    }

    return {
      sections,
      exploreFurther: exploreFurtherTopics,
      moreIdeas: {
        title: 'Related Films',
        movies: moreIdeasMovies,
      },
    };
  }

  // Handle name-based person pages (Phase 1 internal system)
  if (isNameSlug) {
    if (nameBasedError) {
      return (
        <PhoneFrame>
          <div style={styles.container}>
            <BackButton variant="icon" context="person" position="top-left" />
            <div style={styles.inputArea}>
              <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
            </div>
            <div style={styles.errorContainer}>
              <div style={styles.errorText}>Error: {nameBasedError}</div>
              <div style={styles.errorSubtext}>
                Person "{personNameFromSlug}" may not exist in our database.
              </div>
            </div>
          </div>
        </PhoneFrame>
      );
    }

    return (
      <PhoneFrame>
        <div style={styles.container}>
          <BackButton variant="icon" context="person" position="top-left" />
          
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>

          {/* Simple person header for name-based pages */}
          <div style={styles.personHeader}>
            <h1 style={styles.personName}>{personNameFromSlug}</h1>
            {nameBasedStats && (
              <div style={styles.personStats}>
                <span style={styles.movieCount}>
                  {nameBasedStats.movieCount} movie{nameBasedStats.movieCount !== 1 ? 's' : ''}
                </span>
                {nameBasedStats.roles && nameBasedStats.roles.length > 0 && (
                  <span style={styles.roles}>
                    {nameBasedStats.roles.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Movies section */}
          <div style={styles.moviesSection}>
            {nameBasedLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>Loading movies...</div>
              </div>
            ) : nameBasedMovies.length === 0 ? (
              <div style={styles.noMoviesContainer}>
                <div style={styles.noMoviesText}>
                  No movies found for {personNameFromSlug}
                </div>
              </div>
            ) : (
              <>
                <h2 style={styles.sectionTitle}>
                  Movies featuring {personNameFromSlug}
                </h2>
                <div style={styles.moviesList}>
                  {nameBasedMovies.map((movie, index) => (
                    <div key={`${movie.tmdb_id}-${index}`} style={styles.movieItem}>
                      <div style={styles.movieInfo}>
                        <h3 style={styles.movieTitle}>{movie.title} ({movie.year})</h3>
                        <div style={styles.movieRoles}>
                          {movie.roles.map((role, i) => (
                            <span key={role} style={styles.roleTag}>
                              {role}{i < movie.roles.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                        {movie.overview && (
                          <p style={styles.movieOverview}>{movie.overview}</p>
                        )}
                      </div>
                      <div 
                        style={styles.viewMovieButton}
                        onClick={() => router.push(`/movie/${movie.tmdb_id}`)}
                      >
                        View Movie
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Handle TMDB ID-based person pages (existing system)
  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          {/* Back button for navigation */}
          <BackButton variant="icon" context="person" position="top-left" />

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
        {/* Back button for navigation */}
        <BackButton variant="icon" context="person" position="top-left" />

        <div style={styles.inputArea}>
          <SimpleSearch onResults={handleSearchResults} />
        </div>

        {/* Person header using dedicated PersonHeader component */}
        <PersonHeader
          name={name}
          birthYear={birthYear}
          deathYear={deathYear}
          initialBiography={initialBiography}
          initialProfile={initialProfile}
          knownForDepartment={knownForDepartment}
          tmdbId={tmdbId}
        />

        <div style={styles.claudeSection}>
          {isLoadingAnalysis ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingRow}>
                {loadingIcon && (
                  <img
                    src={`/icons/loading/${loadingIcon}`}
                    alt="Loading..."
                    style={styles.filmIcon}
                  />
                )}
                <span style={styles.loadingText}>{loadingMessage}</span>
              </div>
            </div>
          ) : (
            <div style={styles.claudeContent}>
              {/* About the Person header */}
              <h3 style={styles.aboutThePersonTitle}>About {name}</h3>

              {/* Render interleaved sections exactly like movie page */}
              {sections &&
                sections.map((section, sectionIndex) => (
                  <div key={`section-${sectionIndex}`}>
                    {section.type === 'text' && (
                      <div style={styles.textSection}>{underlineProperNames(section.content)}</div>
                    )}
                    {section.type === 'movies' && section.movies && (
                      <div style={styles.movieList}>
                        {section.movies.map((movie, movieIndex) => (
                          <MediaCard
                            key={`${movie.title}-${movie.year}-${sectionIndex}-${movieIndex}`}
                            title={movie.title}
                            year={movie.year}
                            initialSlug={movie.slug}
                            initialPoster={movie.poster}
                            initialStreaming={movie.streaming}
                            tmdbId={movie.tmdb_id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {/* Render Explore Further section */}
              {exploreFurther && exploreFurther.length > 0 && (
                <div style={styles.exploreFurtherSection}>
                  <h3 style={styles.exploreFurtherTitle}>Explore Further</h3>
                  <div style={styles.topicList}>
                    {exploreFurther.map((topic, index) => (
                      <div
                        key={`topic-${index}`}
                        style={styles.topicItem}
                        onClick={() => {
                          const contextualQuery = `${name} (${birthYear ? `b. ${birthYear}` : 'filmmaker'}): ${topic}`;
                          router.push(`/ask?q=${encodeURIComponent(contextualQuery)}`);
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Related Films section */}
              {moreIdeas && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>Related Films</h3>
                  <div style={styles.movieList}>
                    {moreIdeas.movies.map((movie, index) => (
                      <MediaCard
                        key={`${movie.title}-${movie.year}-more-${index}`}
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        initialPoster={movie.poster}
                        initialStreaming={movie.streaming}
                        tmdbId={movie.tmdb_id}
                      />
                    ))}
                  </div>
                </div>
              )}
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
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  claudeSection: {
    flex: 1,
    padding: '0 16px 24px',
    marginTop: '30px',
  },
  claudeContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
  },
  textSection: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
    marginBottom: '16px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
    width: '100%',
  },
  filmIcon: {
    width: '48px',
    height: '48px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  loadingContainer: {
    padding: '10px 16px',
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
  moreIdeasSection: {
    marginTop: '4px',
    paddingTop: '16px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  exploreFurtherSection: {
    marginTop: '2px',
    paddingTop: '16px',
  },
  aboutThePersonTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  exploreFurtherTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  topicList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '0px',
    paddingRight: '0px',
  },
  topicItem: {
    fontSize: '15px',
    color: '#111827',
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    lineHeight: '1.4',
    fontFamily: 'inherit',
  },

  // Styles for name-based person pages (Phase 1 internal system)
  personHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  
  personName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  
  personStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  
  movieCount: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
  },
  
  roles: {
    fontSize: '14px',
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  
  moviesSection: {
    flex: 1,
    padding: '0 16px 24px',
  },
  
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '24px 0 16px 0',
  },
  
  moviesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  movieItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  movieInfo: {
    flex: 1,
  },
  
  movieTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  
  movieRoles: {
    marginBottom: '8px',
  },
  
  roleTag: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  
  movieOverview: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: '0',
  },
  
  viewMovieButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.2s ease',
  },
  
  noMoviesContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  
  noMoviesText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '8px',
  },
  
  errorSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
  },
};

// Server-Side Rendering: Fetch person data by TMDB ID or return props for name-based routing
export async function getStaticProps({ params }) {
  const { id } = params;

  try {
    // Check if this is a name slug (contains non-numeric characters) or TMDB ID (numeric)
    const isNameSlug = id && isNaN(parseInt(id));
    
    // For name slugs, return empty props - client-side rendering will handle the API call
    if (isNameSlug) {
      return {
        props: {
          name: null, // Will be handled client-side
          error: null,
        },
        revalidate: 86400, // 24 hour revalidation
      };
    }
    
    // Handle TMDB ID-based routing (existing logic)
    const tmdbId = parseInt(id, 10);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      return {
        notFound: true,
      };
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Query person from Supabase by TMDB ID
    const { data: personEntry, error } = await supabase
      .from('people')
      .select(
        'id, name, birth_year, death_year, biography, profile_url, known_for_department, tmdb_id'
      )
      .eq('tmdb_id', tmdbId)
      .single();

    if (personEntry && !error) {
      // Person found in Supabase - return as props with ISR
      const response = {
        props: {
          name: personEntry.name,
          birthYear: personEntry.birth_year,
          deathYear: personEntry.death_year,
          initialBiography: personEntry.biography,
          initialProfile: personEntry.profile_url,
          knownForDepartment: personEntry.known_for_department,
          tmdbId: personEntry.tmdb_id,
          error: null,
        },
      };

      // Add ISR revalidation (24 hours like movie pages)
      response.revalidate = 86400; // 24 hour revalidation

      return response;
    } else {
      // Person not found
      return {
        notFound: true,
      };
    }
  } catch (error) {
    console.error('Static generation error:', error);

    return {
      notFound: true,
    };
  }
}

export async function getStaticPaths() {
  // Generate all person pages on-demand for fast builds
  return {
    paths: [], // No pre-generation
    fallback: 'blocking', // Generate on first request
  };
}
