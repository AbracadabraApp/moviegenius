// pages/person/[id].js - TMDB ID based person detail page
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import PhoneFrame from '../../components/PhoneFrame';
import PersonHeader from '../../components/PersonHeader';
import MediaCard from '../../components/MediaCard';
import AskInputBar from '../../components/AskInputBar';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import { FavoritesManager } from '../../components/FavoritesManager';
import { underlineProperNames } from '../../lib/proper-names';
import loadingMessages from '../../data/loading-messages.json';

export default function PersonDetailPage({ name, birthYear, deathYear, initialBiography, initialProfile, knownForDepartment, tmdbId, error }) {
  const router = useRouter();
  const { id } = router.query;
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const [sections, setSections] = useState([]);
  const [exploreFurther, setExploreFurther] = useState([]);
  const [moreIdeas, setMoreIdeas] = useState(null);

  // Handle ask input
  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  useEffect(() => {
    if (!id || !name) return;

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
          'chair-director-outline-icon.png'
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
          throw new Error(`Failed to fetch person analysis: ${claudeResponse.status} - ${errorText}`);
        }

        const data = await claudeResponse.json();
        
        // Parse the response like ask page does
        const parsedData = parseClaudeResponse(data.analysis);
        const sections = parsedData.sections || [];
        const exploreFurther = parsedData.exploreFurther || [];
        const moreIdeas = parsedData.moreIdeas || null;

        // Fetch movie data for all movies in sections and moreIdeas
        const fetchMovieData = async (sectionsToUpdate) => {
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
                      tmdb_id: dbData.tmdb_id 
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
                    tmdb_id: dbData.tmdb_id 
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
            movies: [...currentMovies]
          });
          currentMovies = [];
        }
        // Start new text section
        currentSection = {
          type: 'text',
          content: trimmedLine.replace('PARAGRAPH:', '').trim()
        };
      } else if (trimmedLine.startsWith('MOVIES:')) {
        const movieLine = trimmedLine.replace('MOVIES:', '').trim();
        
        if (movieLine) {
          const parts = movieLine.split('|');
          
          if (parts.length >= 2) { // At least title and year
            const [title, year, description, streaming] = parts;
            const movieObj = {
              title: title?.trim() || 'Unknown Title',
              year: parseInt(year?.trim()) || new Date().getFullYear(),
              slug: description?.trim() || 'No description available',
              poster: '/images/placeholder-poster.jpg' // Default poster
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
            poster: '/images/placeholder-poster.jpg' // Default poster
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
          poster: '/images/placeholder-poster.jpg' // Default poster
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
        movies: [...currentMovies]
      });
    }
    
    return {
      sections,
      exploreFurther: exploreFurtherTopics,
      moreIdeas: {
        title: 'Related Films',
        movies: moreIdeasMovies
      }
    };
  }

  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <AskInputBar onSubmit={handleAsk} />
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
          <AskInputBar onSubmit={handleAsk} />
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
              {sections && sections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`}>
                  {section.type === 'text' && (
                    <div style={styles.textSection}>
                      {underlineProperNames(section.content)}
                    </div>
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
};

// Server-Side Rendering: Fetch person data by TMDB ID
export async function getStaticProps({ params }) {
  const { id } = params;
  
  try {
    const tmdbId = parseInt(id, 10);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      return {
        notFound: true
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
      .select('id, name, birth_year, death_year, biography, profile_url, known_for_department, tmdb_id')
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
          error: null
        }
      };

      // Add ISR revalidation (24 hours like movie pages)
      response.revalidate = 86400; // 24 hour revalidation

      return response;
    } else {
      // Person not found
      return {
        notFound: true
      };
    }
  } catch (error) {
    console.error('Static generation error:', error);
    
    return {
      notFound: true
    };
  }
}

export async function getStaticPaths() {
  // Generate all person pages on-demand for fast builds
  return {
    paths: [], // No pre-generation
    fallback: 'blocking' // Generate on first request
  };
}