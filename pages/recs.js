// pages/recs.js - Dynamic series page that can display any series OR curated lists
import { createClient } from '@supabase/supabase-js'
import PhoneFrame from '../components/PhoneFrame'
import AskInputBar from '../components/AskInputBar'
import MediaCard from '../components/MediaCard'
import { useRouter } from 'next/router'
import { underlineProperNames } from '../lib/proper-names'
import { useState, useEffect } from 'react'
import fs from 'fs'
import path from 'path'

export default function RecsPage({ seriesData, featuredList, otherLists, error, selectedPlatforms: initialPlatforms }) {
  const router = useRouter()
  const { series: seriesId } = router.query // Check for ?series=2 parameter
  const [selectedPlatforms, setSelectedPlatforms] = useState(initialPlatforms || [])
  
  // Determine if we're showing a specific series or the default lists view
  const currentSeries = seriesId && seriesData ? seriesData[seriesId] : null
  
  // Dynamic configuration based on series or default
  const pageConfig = currentSeries ? {
    // Series view configuration
    hero: {
      imageNumber: currentSeries.id || 1,
      alt: currentSeries.title
    },
    series: {
      pillText: "Series",
      title: currentSeries.title,
      subtitle: currentSeries.description
    },
    episodes: currentSeries.episodes.map(episode => ({
      id: episode.id,
      route: `/recs/series/${seriesId}/${episode.id}`,
      title: episode.title,
      subtitle: episode.subtitle,
      posters: episode.posters || []
    })),
    streaming: {
      enabled: true,
      editRoute: '/you#platforms'
    }
  } : {
    // Default lists view configuration  
    hero: {
      imageNumber: 1,
      alt: "MovieGenius Recommendations"
    },
    series: {
      pillText: "Curated",
      title: "Film Recommendations",
      subtitle: "Discover great movies and educational series"
    },
    episodes: [], // No episodes in default view
    streaming: {
      enabled: true,
      editRoute: '/you#platforms'
    }
  }

  const [currentHeroImage, setCurrentHeroImage] = useState(pageConfig.hero.imageNumber)

  // Hero image text color settings - adjust per image
  const heroTextSettings = {
    1: 'light',   // hero-1.jpg - use white text (dark image)
    2: 'light',   // hero-2.jpg - use white text  
    3: 'light',   // hero-3.jpg - use white text
    4: 'dark',    // hero-4.jpg - use dark text (light image)
    5: 'light',   // hero-5.jpg - use white text
    6: 'light',   // hero-6.jpg - use white text
    7: 'light',   // hero-7.jpg - use white text
    8: 'light',   // hero-8.jpg - use white text
    9: 'light',   // hero-9.jpg - use white text
    10: 'light',  // hero-10.jpg - use white text
    11: 'dark',   // hero-11.jpg - use dark text (light image)
  }

  const currentTextStyle = heroTextSettings[currentHeroImage] || 'light'

  // Load selected platforms from localStorage
  useEffect(() => {
    const loadSelectedPlatforms = () => {
      try {
        const saved = localStorage.getItem('selectedPlatforms')
        if (saved) {
          const platforms = JSON.parse(saved)
          setSelectedPlatforms(platforms)
        }
      } catch (error) {
        console.error('Error loading platforms from localStorage:', error)
        setSelectedPlatforms([])
      }
    }

    loadSelectedPlatforms()

    // Listen for platform updates
    const handlePlatformUpdate = () => {
      loadSelectedPlatforms()
    }
    
    window.addEventListener('platformsUpdated', handlePlatformUpdate)
    return () => window.removeEventListener('platformsUpdated', handlePlatformUpdate)
  }, [])

  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    })
  }

  const handleEditPlatforms = () => {
    // Navigate to You page with platforms section expanded
    router.push('/you#platforms')
  }

  if (error) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.fixedInputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          <div style={styles.error}>
            Error loading recommendations: {error}
          </div>
        </div>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar - Always on top */}
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Scrollable Content - Everything scrolls under ask bar */}
        <div style={styles.scrollableContent}>
          {/* Hero Image - Scrolls normally */}
          <div style={styles.heroImageContainer}>
            <img 
              src={`/images/hero-rotation/hero-${pageConfig.hero.imageNumber}.jpg`} 
              alt={pageConfig.hero.alt}
              style={styles.heroImage}
            />
          </div>
          
          {/* Series Header - Pill scrolls away */}
          <div style={styles.seriesHeaderField}>
            <div style={styles.seriesLabelPill}>{pageConfig.series.pillText}</div>
            {currentSeries && (
              <div style={styles.backToAllSeries} onClick={() => router.push('/recs/series')}>
                ← Browse All Series
              </div>
            )}
          </div>
          
          {/* Sticky Title Section - Only headline sticks */}
          <div style={styles.stickyTitleHeader}>
            <div style={styles.titleHeaderField}>
              <div style={styles.seriesTitle}>{pageConfig.series.title}</div>
              <div style={styles.seriesSubhead}>{pageConfig.series.subtitle}</div>
            </div>
          </div>
        
          <div style={styles.content}>
            {/* Episode Cards - Only show if we have episodes (series view) */}
            {pageConfig.episodes.length > 0 && (
              <div style={styles.episodesSection}>
                {pageConfig.episodes.map((episode) => (
                  <div 
                    key={episode.id}
                    style={styles.episodeCard}
                    onClick={() => router.push(episode.route)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.35)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={styles.episodeContent}>
                      <h3 style={styles.episodeTitle}>{episode.title}</h3>
                      <p style={styles.episodeSubtitle}>{episode.subtitle}</p>
                    </div>
                    <div style={styles.episodeImageRow}>
                      {episode.posters.map((poster, index) => (
                        <img 
                          key={index}
                          src={poster} 
                          alt={`Episode ${episode.id} movie ${index + 1}`} 
                          style={styles.episodeMovieImage} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Educational Series Section - Only show in default view */}
            {!currentSeries && seriesData && Object.keys(seriesData).length > 0 && (
              <div style={styles.seriesOverviewSection}>
                <h2 style={styles.sectionTitle}>Educational Film Series</h2>
                <div style={styles.seriesGrid}>
                  {Object.values(seriesData).slice(0, 3).map((series) => (
                    <div 
                      key={series.id}
                      style={styles.seriesCard}
                      onClick={() => router.push(`/recs?series=${series.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <h3 style={styles.seriesCardTitle}>{series.title}</h3>
                      <p style={styles.seriesCardDescription}>{series.description}</p>
                      <div style={styles.episodeCount}>{series.episodes.length} Episodes</div>
                    </div>
                  ))}
                </div>
                <button 
                  style={styles.viewAllSeriesButton}
                  onClick={() => router.push('/recs/series')}
                >
                  View All Educational Series
                </button>
              </div>
            )}

            {/* Featured List */}
            {featuredList && (
              <div style={styles.featuredSection}>
                <h2 style={styles.featuredTitle}>{featuredList.name}</h2>
                {featuredList.claude_description && (
                  <div style={styles.featuredContent}>
                    <div style={styles.textSection}>
                      {underlineProperNames(featuredList.claude_description)}
                    </div>
                  </div>
                )}
                {featuredList.movies && featuredList.movies.length > 0 && (
                  <div style={styles.movieList}>
                    {featuredList.movies.slice(0, 6).map((movie) => (
                      <MediaCard
                        key={movie.id}
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        initialPoster={movie.poster_url}
                        initialStreaming={movie.streaming_data}
                        tmdbId={movie.tmdb_id}
                      />
                    ))}
                  </div>
                )}
                <button 
                  style={styles.exploreButton}
                  onClick={() => router.push(`/genius/list/${featuredList.id}`)}
                >
                  Explore Full List
                </button>
              </div>
            )}

            {/* Other Lists */}
            {otherLists && otherLists.length > 0 && (
              <div style={styles.otherListsSection}>
                <h3 style={styles.otherListsTitle}>More Curated Lists</h3>
                <div style={styles.buttonGrid}>
                  {otherLists.map((list) => (
                    <button
                      key={list.id}
                      style={styles.listButton}
                      onClick={() => router.push(`/genius/list/${list.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {list.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Streaming Services Box - Conditional based on page config */}
          {pageConfig.streaming.enabled && (
            <div style={styles.streamingBoxBottom}>
              <span style={styles.streamingText}>
                Your streaming services: {selectedPlatforms.length > 0 ? selectedPlatforms.join(', ') : 'None selected'}
              </span>
              <button 
                style={styles.editButton}
                onClick={() => router.push(pageConfig.streaming.editRoute)}
              >
                (edit)
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  )
}

// Server-Side Rendering: Load series data and curated lists
export async function getServerSideProps({ query, res }) {
  try {
    // Set cache headers
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=3600'
    );
    
    // Load series data from static configuration file
    let seriesData = {};
    try {
      const filePath = path.join(process.cwd(), 'data', 'series-config.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      seriesData = JSON.parse(fileContent);
    } catch (seriesError) {
      console.error('Error loading series config:', seriesError);
    }
    
    // Server-side Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get one featured list with movies (only if not in series view)
    let featuredData = null;
    let otherLists = [];
    
    if (!query.series) {
      const { data: featured, error: featuredError } = await supabase
        .from('movie_lists')
        .select(`
          id,
          name,
          slug,
          claude_description,
          movies:movie_list_items(
            movies(
              id,
              title,
              year,
              slug,
              poster_url,
              streaming_data,
              tmdb_id
            )
          )
        `)
        .eq('is_active', true)
        .eq('content_type', 'declarative')
        .limit(1)
        .single();

      if (featuredError && featuredError.code !== 'PGRST116') {
        console.error('Featured list query error:', featuredError);
      } else {
        featuredData = featured;
      }

      // Get all other lists for grid
      const { data: others, error: otherError } = await supabase
        .from('movie_lists')
        .select('id, name, slug')
        .eq('is_active', true)
        .eq('content_type', 'declarative')
        .neq('id', featuredData?.id || 0)
        .order('name');

      if (otherError) {
        console.error('Other lists query error:', otherError);
      } else {
        otherLists = others || [];
      }
    }

    // Transform featured list movies
    const featuredList = featuredData ? {
      ...featuredData,
      movies: featuredData.movies?.map(item => item.movies).filter(Boolean) || []
    } : null;

    return {
      props: {
        seriesData,
        featuredList,
        otherLists,
        error: null,
        selectedPlatforms: [] // Will be loaded client-side
      }
    }
  } catch (error) {
    console.error('Server-side fetch error:', error)
    
    return {
      props: {
        seriesData: {},
        featuredList: null,
        otherLists: [],
        error: error.message,
        selectedPlatforms: []
      }
    }
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  streamingBoxBottom: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginTop: '24px',
  },
  streamingText: {
    color: '#374151',
    flex: 1,
  },
  editButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline',
    padding: '0',
    marginLeft: '8px',
  },
  content: {
    padding: '16px',
  },
  episodesSection: {
    marginBottom: '32px',
  },
  episodeCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
    marginBottom: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  },
  episodeImageRow: {
    display: 'flex',
    width: '100%',
    height: '80px',
    overflow: 'hidden',
  },
  episodeMovieImage: {
    flex: 1,
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
    filter: 'brightness(0.8) contrast(0.9) saturate(0.7)',
    opacity: 0.85,
  },
  episodeContent: {
    padding: '24px',
    backgroundColor: '#ffffff',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.3',
    margin: 0,
    marginBottom: '6px',
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.3',
    margin: 0,
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
  },
  featuredSection: {
    marginBottom: '32px',
    paddingTop: '24px',
  },
  featuredTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
  },
  featuredContent: {
    marginBottom: '16px',
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
    marginBottom: '16px',
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
  },
  otherListsSection: {
    marginTop: '24px',
  },
  otherListsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'left',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  listButton: {
    padding: '16px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    textAlign: 'center',
    lineHeight: '1.4',
    fontFamily: 'inherit',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    border: 'none',
  },
  heroImageContainer: {
    position: 'relative',
    width: '100%',
    height: '200px',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 16px 16px 16px',
  },
  heroOverlayTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    marginBottom: '4px',
  },
  heroOverlaySubtitle: {
    fontSize: '16px',
    margin: 0,
  },
  seriesHeaderField: {
    padding: '20px 16px 12px 16px',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
  },
  stickyTitleHeader: {
    position: 'sticky',
    top: '0px', // Stick right to the top of scrollable content
    zIndex: 90, // Below ask bar (100) but above content
    marginTop: '0px', // Remove any default margins
  },
  titleHeaderField: {
    padding: '16px 16px 20px 16px',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
  },
  seriesLabelPill: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
  },
  seriesTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    marginBottom: '6px',
  },
  seriesSubhead: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#d1d5db',
    margin: 0,
    lineHeight: '1.4',
  },
  error: {
    padding: '20px',
    textAlign: 'center',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    margin: '16px',
  },
  backToAllSeries: {
    fontSize: '14px',
    color: '#d1d5db',
    cursor: 'pointer',
    marginTop: '8px',
    padding: '4px 0',
    transition: 'color 0.2s ease',
  },
  seriesOverviewSection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'left',
  },
  seriesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  seriesCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  seriesCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    marginBottom: '6px',
    lineHeight: '1.3',
  },
  seriesCardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: 0,
    marginBottom: '12px',
  },
  episodeCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  viewAllSeriesButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'background-color 0.2s ease',
  },
};