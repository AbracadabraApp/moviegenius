// pages/list/[slug].js
/**
 * Movie List Page
 * 
 * Displays curated movie collections with Claude-generated descriptions.
 * Supports lists like "Movies That Chose Chaos", "AFI 100", etc.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MediaCard from '../../components/MediaCard';
import PhoneFrame from '../../components/PhoneFrame';
import AskInputBar from '../../components/AskInputBar';

// Parse Claude content into interleaved sections (like movie page)
function parseClaudeContentIntoSections(content) {
  if (!content) return [];
  
  // Check if it's educational format (PARAGRAPH: / MOVIES:)
  if (content.includes('PARAGRAPH:')) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    let currentMovies = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
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
          
          if (parts.length >= 2) {
            const [title, year, description, streaming] = parts;
            const movieObj = {
              title: title?.trim() || 'Unknown Title',
              year: parseInt(year?.trim()) || new Date().getFullYear(),
              slug: description?.trim() || 'No description available',
              poster: '/images/placeholder-poster.jpg'
            };
            
            currentMovies.push(movieObj);
          }
        }
      } else if (currentSection && trimmedLine) {
        currentSection.content += ' ' + trimmedLine;
      }
    }
    
    // Handle final sections
    if (currentSection) {
      sections.push(currentSection);
    }
    
    if (currentMovies.length > 0) {
      sections.push({
        type: 'movies',
        movies: [...currentMovies]
      });
    }
    
    return sections;
  }
  
  // For declarative format, return simple text
  if (content.includes('DESCRIPTION:')) {
    const description = content.split('MOVIES:')[0].replace('DESCRIPTION:', '').trim();
    return [{ type: 'text', content: description }];
  }
  
  // Fallback: treat as plain paragraphs
  return content.split('\n\n').filter(p => p.trim()).map(p => ({ type: 'text', content: p }));
}

// Enhance Claude movies with TMDB data (like movie page)
async function enhanceClaudeMoviesWithTMDB(sections) {
  const enhancedSections = [];
  
  for (const section of sections) {
    if (section.type === 'movies' && section.movies) {
      const enhancedMovies = [];
      for (const movie of section.movies) {
        try {
          const dbResponse = await fetch('/api/lookup-movie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: movie.title, year: movie.year }),
          });
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            enhancedMovies.push({ 
              ...movie, 
              poster: dbData.poster_url || movie.poster,
              tmdb_id: dbData.tmdb_id 
            });
          } else {
            enhancedMovies.push(movie);
          }
        } catch (error) {
          console.error('Error fetching movie data for', movie.title, error);
          enhancedMovies.push(movie);
        }
      }
      enhancedSections.push({ ...section, movies: enhancedMovies });
    } else {
      enhancedSections.push(section);
    }
  }
  
  return enhancedSections;
}

export default function MovieListPage() {
  const router = useRouter();
  const { slug } = router.query;
  
  const [listData, setListData] = useState(null);
  const [claudeDescription, setClaudeDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [claudeSections, setClaudeSections] = useState([]);

  useEffect(() => {
    if (!slug) return;

    const fetchListData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch list data
        const response = await fetch(`/api/movie-list?slug=${slug}`);
        
        if (!response.ok) {
          throw new Error('List not found');
        }

        const data = await response.json();
        setListData(data);

        // Use cached description if available, otherwise generate one
        if (data.claudeDescription) {
          setClaudeDescription(data.claudeDescription);
          
          // For educational lists, enhance Claude movies with TMDB data
          if (data.list.content_type === 'educational') {
            const sections = parseClaudeContentIntoSections(data.claudeDescription);
            const enhancedSections = await enhanceClaudeMoviesWithTMDB(sections);
            setClaudeSections(enhancedSections);
          }
        } else if (data.list.claude_prompt) {
          // Generate Claude description
          setGeneratingDescription(true);
          const analysisResponse = await fetch('/api/list-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listId: data.list.id,
              listName: data.list.name,
              claudePrompt: data.list.claude_prompt
            })
          });

          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            setClaudeDescription(analysisData.analysis);
          }
          setGeneratingDescription(false);
        }

      } catch (err) {
        console.error('Error fetching list:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListData();
  }, [slug]);

  if (loading) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <AskInputBar />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading list...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <AskInputBar />
          </div>
          <div style={styles.errorContainer}>
            <h2 style={styles.errorTitle}>List Not Found</h2>
            <p style={styles.errorText}>{error}</p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.inputArea}>
          <AskInputBar />
        </div>
        
        <div style={styles.content}>
          {/* List Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>{listData.list.name}</h1>
          </div>

          {/* Educational Content - interleaved like movie page */}
          {claudeDescription && listData.list.content_type === 'educational' && (
            <div style={styles.claudeContent}>
              {claudeSections.length > 0 ? (
                claudeSections.map((section, sectionIndex) => (
                  <div key={`section-${sectionIndex}`}>
                    {section.type === 'text' && (
                      <div style={styles.textSection}>
                        {section.content}
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
                ))
              ) : (
                // Fallback while TMDB enhancement is loading
                parseClaudeContentIntoSections(claudeDescription).map((section, sectionIndex) => (
                  <div key={`fallback-${sectionIndex}`}>
                    {section.type === 'text' && (
                      <div style={styles.textSection}>
                        {section.content}
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
                ))
              )}
            </div>
          )}

          {/* Declarative Content - simple description */}
          {claudeDescription && listData.list.content_type !== 'educational' && (
            <div style={styles.claudeContent}>
              {parseClaudeContentIntoSections(claudeDescription).map((section, index) => (
                <div key={index} style={styles.textSection}>
                  {section.content}
                </div>
              ))}
            </div>
          )}

          {/* Database Movies List */}
          <div style={styles.moviesSection}>
            <div style={styles.moviesList}>
              {listData.movies.map((movie) => (
                <div key={movie.id} style={styles.movieCardWrapper}>
                  <MediaCard
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    initialPoster={movie.poster_url}
                    initialStreaming={movie.streaming_data}
                    tmdbId={movie.tmdb_id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    overflowY: 'scroll', scrollbarWidth: 'none', msOverflowStyle: 'none',
    padding: '0 16px 24px', // Match movie page padding
  },
  loadingContainer: {
    padding: '10px 16px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280', // Match ask page loading color
  },
  errorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '12px',
  },
  errorText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  header: {
    marginBottom: '20px',
    textAlign: 'left',
    paddingTop: '16px',
  },
  title: {
    fontSize: '18px', // Match movie page title weight
    fontWeight: '600',
    color: '#374151', // Match movie page color
    marginBottom: '12px', // Match movie page spacing
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b7280', // Match app's muted text color
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  stats: {
    fontSize: '13px',
    color: '#9ca3af', // Lighter stats color
    fontWeight: '500',
  },
  paragraph: {
    marginBottom: '14px',
  },
  generating: {
    textAlign: 'center',
    padding: '16px',
  },
  generatingText: {
    fontSize: '15px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  moviesSection: {
    marginBottom: '40px',
  },
  moviesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px', // Match MediaCard spacing
  },
  movieCardWrapper: {
    width: '100%',
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
};