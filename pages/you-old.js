/**
 * You Page - Progressive Cinematic Education
 * Your personal film journey with intelligent insights and learning opportunities
 */
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import { FavoritesManager } from '../components/FavoritesManager';
import {
  Heart,
  Bookmark,
  Sparkles,
  Eye,
  BookOpen,
  ChevronRight,
  Info,
  Check,
  Plus,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function YouPage() {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEducationalTip, setShowEducationalTip] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from FavoritesManager
  useEffect(() => {
    try {
      const hearted = FavoritesManager.getHeartedMovies();
      const bookmarked = FavoritesManager.getBookmarkedMovies();
      setHeartedMovies(hearted);
      setBookmarkedMovies(bookmarked);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setIsLoaded(true);
    }
  }, []);

  // Listen for updates from other components
  useEffect(() => {
    const handleUpdate = () => {
      try {
        setHeartedMovies(FavoritesManager.getHeartedMovies());
        setBookmarkedMovies(FavoritesManager.getBookmarkedMovies());
      } catch (error) {
        console.error('Error updating favorites:', error);
      }
    };

    window.addEventListener('moviesUpdated', handleUpdate);
    return () => window.removeEventListener('moviesUpdated', handleUpdate);
  }, []);

  // Generate progressive insights based on user's collection
  const generateInsights = () => {
    const totalFilms = heartedMovies.length;

    if (totalFilms === 0) {
      return {
        level: 'beginning',
        title: 'Your Cinematic Journey Begins',
        description: 'Start building your film collection',
        icon: '🎬',
        insight: null,
      };
    }

    if (totalFilms <= 5) {
      return {
        level: 'exploring',
        title: 'Building Your Foundation',
        description: `${totalFilms} ${totalFilms === 1 ? 'film' : 'films'} loved`,
        icon: '🌱',
        insight: 'Every film you love teaches us about your taste',
      };
    }

    if (totalFilms <= 15) {
      return {
        level: 'discovering',
        title: 'Patterns Emerging',
        description: `${totalFilms} films • Taste developing`,
        icon: '🔍',
        insight: 'Your collection reveals emerging patterns in your cinematic preferences',
      };
    }

    return {
      level: 'understanding',
      title: 'Cinematic Understanding',
      description: `${totalFilms} films • Strong profile`,
      icon: '🎭',
      insight: 'Your sophisticated collection spans genres, eras, and storytelling traditions',
    };
  };

  const insights = generateInsights();

  const handleSearchResults = results => {
    if (results && results.length > 0) {
      const firstResult = results[0];
      if (firstResult.tmdb_id) {
        router.push(`/movie/${firstResult.tmdb_id}`);
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'Journey', icon: Eye },
    { id: 'loved', label: 'Loved', icon: Heart, count: heartedMovies.length },
    { id: 'queue', label: 'Queue', icon: Bookmark, count: bookmarkedMovies.length },
  ];

  if (!isLoaded) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}>Loading...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Fixed Search */}
        <div style={styles.searchSection}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Discover films..." />
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabBar}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(isActive ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} color={isActive ? '#d4af37' : '#6b7280'} />
                <span
                  style={{
                    ...styles.tabLabel,
                    color: isActive ? '#d4af37' : '#6b7280',
                  }}
                >
                  {tab.label}
                </span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      ...styles.tabCount,
                      backgroundColor: isActive ? '#d4af37' : '#e5e7eb',
                      color: isActive ? '#000' : '#6b7280',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={styles.content}>
          {activeTab === 'overview' && (
            <div style={styles.overviewTab}>
              {/* Progress Header */}
              <div style={styles.progressCard}>
                <div style={styles.progressHeader}>
                  <span style={styles.progressIcon}>{insights.icon}</span>
                  <div style={styles.progressInfo}>
                    <h2 style={styles.progressTitle}>{insights.title}</h2>
                    <p style={styles.progressDescription}>{insights.description}</p>
                  </div>
                  {insights.insight && (
                    <button
                      style={styles.infoButton}
                      onClick={() => setShowEducationalTip(!showEducationalTip)}
                      title="Learn more"
                    >
                      <Info size={16} color="#6b7280" />
                    </button>
                  )}
                </div>

                {insights.insight && (
                  <div style={styles.insightBar}>
                    <Sparkles size={14} color="#d4af37" />
                    <span style={styles.insightText}>{insights.insight}</span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <Heart size={16} color="#ef4444" />
                  <div style={styles.statInfo}>
                    <span style={styles.statNumber}>{heartedMovies.length}</span>
                    <span style={styles.statLabel}>Films Loved</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <Bookmark size={16} color="#3b82f6" />
                  <div style={styles.statInfo}>
                    <span style={styles.statNumber}>{bookmarkedMovies.length}</span>
                    <span style={styles.statLabel}>In Queue</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <Eye size={16} color="#6b7280" />
                  <div style={styles.statInfo}>
                    <span style={styles.statNumber}>
                      {heartedMovies.length + bookmarkedMovies.length}
                    </span>
                    <span style={styles.statLabel}>Total</span>
                  </div>
                </div>
              </div>

              {/* Understanding Level */}
              {heartedMovies.length > 0 && (
                <div style={styles.understandingSection}>
                  <h3 style={styles.sectionTitle}>What We're Learning</h3>
                  <div style={styles.understandingCard}>
                    <div style={styles.understandingText}>
                      {heartedMovies.length <= 5
                        ? "Based on your early selections, we're starting to see patterns in your taste. Keep exploring to help us understand what resonates with you."
                        : heartedMovies.length <= 15
                          ? 'With your viewing history, we can identify themes you gravitate toward. Your collection shows developing sophistication and range.'
                          : 'Your film collection reveals sophisticated taste patterns across genres and eras. We have a strong understanding of your cinematic preferences.'}
                    </div>
                    <div style={styles.understandingNote}>
                      <span style={styles.noteText}>
                        {heartedMovies.length <= 5
                          ? 'Love more films for deeper insights'
                          : heartedMovies.length <= 15
                            ? 'Pattern recognition developing'
                            : 'Strong taste profile established'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Learning Opportunities */}
              {heartedMovies.length >= 3 && (
                <div style={styles.learningOpportunities}>
                  <div style={styles.learningCard}>
                    <div style={styles.learningHeader}>
                      <BookOpen size={16} color="#d4af37" />
                      <span style={styles.learningTitle}>Essential Films</span>
                    </div>
                    <p style={styles.learningText}>
                      Explore curated collections on the Browse page to discover new films that match
                      your taste
                    </p>
                    <button
                      style={styles.exploreButton}
                      onClick={() => router.push('/browse')}
                    >
                      <span>Explore Collections</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {bookmarkedMovies.length > 0 && (
                    <div style={styles.quizCard}>
                      <div style={styles.learningHeader}>
                        <Sparkles size={16} color="#d4af37" />
                        <span style={styles.learningTitle}>Your Queue</span>
                      </div>
                      <p style={styles.learningText}>
                        You have {bookmarkedMovies.length} {bookmarkedMovies.length === 1 ? 'film' : 'films'} waiting to watch. Start with your earliest bookmarks for a natural progression.
                      </p>
                      <button
                        style={styles.quizButton}
                        onClick={() => setActiveTab('queue')}
                      >
                        <span>View Queue</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {heartedMovies.length === 0 && bookmarkedMovies.length === 0 && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🎬</div>
                  <p style={styles.emptyTitle}>Start Your Film Journey</p>
                  <p style={styles.emptySubtext}>
                    Search for films, then tap the heart ❤️ to mark films you love or the bookmark 🔖 to save films to watch later.
                  </p>
                  <button
                    style={styles.exploreButton}
                    onClick={() => router.push('/browse')}
                  >
                    <span>Browse Collections</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'loved' && (
            <div style={styles.listTab}>
              <div style={styles.listHeader}>
                <h3 style={styles.listTitle}>Films You Love</h3>
                {heartedMovies.length > 5 && (
                  <div style={styles.listInsight}>
                    <Sparkles size={12} color="#d4af37" />
                    <span style={styles.listInsightText}>
                      Your collection reflects {heartedMovies.length > 15 ? 'sophisticated' : 'developing'} taste
                    </span>
                  </div>
                )}
              </div>

              {heartedMovies.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>❤️</div>
                  <p style={styles.emptyTitle}>No films loved yet</p>
                  <p style={styles.emptySubtext}>
                    Mark films you love with the heart button to build your collection
                  </p>
                </div>
              ) : (
                <div style={styles.filmGrid}>
                  {heartedMovies.map((movie, index) => (
                    <MediaCard
                      key={movie.id || movie.tmdbId || index}
                      title={movie.title}
                      year={movie.year}
                      initialSlug={movie.slug}
                      initialPoster={movie.poster}
                      tmdbId={movie.tmdbId || movie.tmdb_id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'queue' && (
            <div style={styles.listTab}>
              <div style={styles.listHeader}>
                <h3 style={styles.listTitle}>Your Viewing Queue</h3>
                {bookmarkedMovies.length > 0 && (
                  <div style={styles.listInsight}>
                    <Sparkles size={12} color="#d4af37" />
                    <span style={styles.listInsightText}>
                      {bookmarkedMovies.length} {bookmarkedMovies.length === 1 ? 'film' : 'films'} ready to discover
                    </span>
                  </div>
                )}
              </div>

              {bookmarkedMovies.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🔖</div>
                  <p style={styles.emptyTitle}>Your queue is empty</p>
                  <p style={styles.emptySubtext}>
                    Bookmark films with the bookmark button to save them for later
                  </p>
                </div>
              ) : (
                <div style={styles.filmGrid}>
                  {bookmarkedMovies.map((movie, index) => (
                    <MediaCard
                      key={movie.id || movie.tmdbId || index}
                      title={movie.title}
                      year={movie.year}
                      initialSlug={movie.slug}
                      initialPoster={movie.poster}
                      tmdbId={movie.tmdbId || movie.tmdb_id}
                    />
                  ))}
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
    height: '100%',
    backgroundColor: '#fafafa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
  },
  loadingSpinner: {
    fontSize: '16px',
    color: '#6b7280',
  },
  searchSection: {
    padding: '16px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
  },
  tabBar: {
    display: 'flex',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    paddingHorizontal: '4px',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    gap: '4px',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#fafafa',
  },
  tabLabel: {
    fontSize: '12px',
    fontWeight: '500',
  },
  tabCount: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  overviewTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  progressIcon: {
    fontSize: '28px',
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
  },
  progressDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  infoButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
  },
  insightBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fed7aa',
  },
  insightText: {
    fontSize: '13px',
    color: '#92400e',
    fontStyle: 'italic',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statNumber: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  understandingSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 12px 0',
  },
  understandingCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  understandingText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  understandingNote: {
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
  },
  noteText: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  learningOpportunities: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  learningCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  learningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  learningTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  learningText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  exploreButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#d4af37',
    color: '#000',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  quizButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#374151',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  listTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  listHeader: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  listTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  listInsight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  listInsightText: {
    fontSize: '13px',
    color: '#92400e',
    fontStyle: 'italic',
  },
  filmGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
};
