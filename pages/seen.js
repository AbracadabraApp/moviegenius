// Seen Movies page - Paginated list of user's seen movies
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { colors, spacing, typography } from '../lib/design-tokens';
import { FavoritesManager } from '../components/FavoritesManager';

const MOVIES_PER_PAGE = 40;

export default function SeenMoviesPage() {
  const router = useRouter();
  const [seenMovies, setSeenMovies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Load seen movies from localStorage
  useEffect(() => {
    const loadSeenMovies = () => {
      try {
        const heartedMovies = FavoritesManager.getHeartedMovies();
        
        // Convert to movie objects with necessary data
        const movieObjects = heartedMovies.map(movie => ({
          title: movie.title,
          year: movie.year,
          tmdb_id: movie.tmdb_id || null,
          poster_url: movie.poster_url || null,
          streaming_data: movie.streaming_data || null,
          slug: movie.slug || null
        }));

        // Sort by title for consistent ordering
        movieObjects.sort((a, b) => a.title.localeCompare(b.title));
        
        setSeenMovies(movieObjects);
        setLoading(false);
      } catch (error) {
        console.error('Error loading seen movies:', error);
        setSeenMovies([]);
        setLoading(false);
      }
    };

    loadSeenMovies();

    // Listen for favorites updates
    const handleMoviesUpdate = () => {
      loadSeenMovies();
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(seenMovies.length / MOVIES_PER_PAGE);
  const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
  const endIndex = startIndex + MOVIES_PER_PAGE;
  const currentMovies = seenMovies.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  if (loading) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.headerTop}>
              <button
                onClick={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color={colors.gray[600]} />
              </button>
              <h1 style={styles.title}>Seen Movies</h1>
            </div>
            <SimpleSearch placeholder="Search movies..." />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading your seen movies...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <button
              onClick={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={colors.gray[600]} />
            </button>
            <h1 style={styles.title}>Seen Movies</h1>
          </div>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {seenMovies.length > 0 ? (
            <>
              {/* Movies count and pagination info */}
              <div style={styles.infoBar}>
                <span style={styles.totalCount}>
                  {seenMovies.length} {seenMovies.length === 1 ? 'movie' : 'movies'} seen
                </span>
                {totalPages > 1 && (
                  <span style={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Movies grid */}
              <div style={styles.moviesGrid}>
                {currentMovies.map((movie, index) => (
                  <div 
                    key={`${movie.tmdb_id || movie.title}-${index}`}
                    onClick={() => handleMovieClick(movie)}
                    style={styles.movieCard}
                  >
                    <MediaCard
                      title={movie.title}
                      year={movie.year}
                      initialSlug={movie.slug}
                      initialPoster={movie.poster_url}
                      initialStreaming={movie.streaming_data}
                      tmdbId={movie.tmdb_id}
                      showSeenSelected={true}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                    }}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <div style={styles.paginationNumbers}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          style={{
                            ...styles.pageNumber,
                            ...(pageNum === currentPage ? styles.pageNumberActive : {})
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                    }}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎬</div>
              <div style={styles.emptyTitle}>No movies seen yet</div>
              <div style={styles.emptyText}>
                Start marking movies as seen to build your collection.
              </div>
              <button
                onClick={() => router.push('/suggestions')}
                style={styles.suggestionsButton}
              >
                Browse Suggestions
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    paddingBottom: '100px',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: `1px solid ${colors.border}`,
    padding: spacing[4],
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#d4af37',
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    padding: spacing[4],
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
  },
  loadingText: {
    fontSize: '16px',
    color: colors.gray[600],
  },
  infoBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
    padding: `0 ${spacing[2]}`,
  },
  totalCount: {
    fontSize: '14px',
    color: colors.gray[700],
    fontWeight: '500',
  },
  pageInfo: {
    fontSize: '14px',
    color: colors.gray[500],
  },
  moviesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
    marginBottom: spacing[6],
  },
  movieCard: {
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[6],
  },
  paginationButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: colors.gray[100],
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.gray[700],
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'all 0.2s ease',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  paginationNumbers: {
    display: 'flex',
    gap: '4px',
  },
  pageNumber: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.gray[700],
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'all 0.2s ease',
  },
  pageNumberActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
    color: 'white',
  },
  emptyState: {
    textAlign: 'center',
    padding: `${spacing[8]} ${spacing[4]}`,
    color: colors.gray[600],
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
    color: colors.gray[700],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  suggestionsButton: {
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'all 0.2s ease',
  },
};