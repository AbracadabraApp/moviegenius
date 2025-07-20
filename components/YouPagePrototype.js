// components/YouPagePrototype.js - Reimagined You page focused on progressive cinematic education
import PhoneFrame from './PhoneFrame';
import SimpleSearch from './SimpleSearch';
import MediaCard from './MediaCard';
import PlatformSelector from './PlatformSelector';
import {
  Heart,
  Bookmark,
  Play,
  Sparkles,
  Eye,
  BookOpen,
  Tv,
  ChevronRight,
  Info,
  Check,
  Plus,
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function YouPagePrototype() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEducationalTip, setShowEducationalTip] = useState(false);
  const [currentInsight, setCurrentInsight] = useState(null);

  // Mock data loading (replace with real implementation)
  useEffect(() => {
    // Load from localStorage
    const platforms = JSON.parse(localStorage.getItem('selectedPlatforms') || '[]');
    const hearted = JSON.parse(localStorage.getItem('heartedMovies') || '[]');
    const bookmarked = JSON.parse(localStorage.getItem('bookmarkedMovies') || '[]');

    setSelectedPlatforms(platforms);
    setHeartedMovies(hearted);
    setBookmarkedMovies(bookmarked);
  }, []);

  // Generate progressive insights based on user's collection
  const generateInsights = () => {
    const totalFilms = heartedMovies.length;
    const hasBookmarks = bookmarkedMovies.length > 0;

    if (totalFilms === 0) {
      return {
        level: 'beginning',
        title: 'Your Cinematic Journey Begins',
        description: 'Start building your film collection',
        icon: '🎬',
        insight: null,
      };
    }

    if (totalFilms < 5) {
      return {
        level: 'exploring',
        title: 'Building Your Foundation',
        description: `${totalFilms} films loved`,
        icon: '🌱',
        insight: 'Every film you love teaches us about your taste',
      };
    }

    if (totalFilms < 15) {
      return {
        level: 'discovering',
        title: 'Patterns Emerging',
        description: `${totalFilms} films • Taste developing`,
        icon: '🔍',
        insight: 'You gravitate toward character-driven stories',
      };
    }

    return {
      level: 'understanding',
      title: 'Cinematic Understanding',
      description: `${totalFilms} films • Strong profile`,
      icon: '🎭',
      insight: 'Your taste reflects humanist cinema traditions',
    };
  };

  const insights = generateInsights();

  const handleSearchResults = results => {
    console.log('Search results:', results);
  };

  const handlePlatformChange = platforms => {
    setSelectedPlatforms(platforms);
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms));
  };

  const tabs = [
    { id: 'overview', label: 'Journey', icon: Eye },
    { id: 'seen', label: 'Seen', icon: Check, count: heartedMovies.length },
    { id: 'queue', label: 'Queue', icon: Plus, count: bookmarkedMovies.length },
    { id: 'platforms', label: 'Access', icon: Tv, count: selectedPlatforms.length },
  ];

  return (
    <PhoneFrame active="you">
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
                  <button
                    style={styles.infoButton}
                    onClick={() => setShowEducationalTip(!showEducationalTip)}
                  >
                    <Info size={16} color="#6b7280" />
                  </button>
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
                  <Check size={16} color="#6b7280" />
                  <div style={styles.statInfo}>
                    <span style={styles.statNumber}>{heartedMovies.length}</span>
                    <span style={styles.statLabel}>Films Seen</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <Plus size={16} color="#6b7280" />
                  <div style={styles.statInfo}>
                    <span style={styles.statNumber}>{bookmarkedMovies.length}</span>
                    <span style={styles.statLabel}>In Queue</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <Play size={16} color="#6b7280" />
                  <div style={styles.statInfo}>
                    <span style={styles.statNumber}>{selectedPlatforms.length}</span>
                    <span style={styles.statLabel}>Platforms</span>
                  </div>
                </div>
              </div>

              {/* Understanding Level */}
              {heartedMovies.length > 0 && (
                <div style={styles.understandingSection}>
                  <h3 style={styles.sectionTitle}>What We're Learning</h3>
                  <div style={styles.understandingCard}>
                    <div style={styles.understandingText}>
                      {heartedMovies.length < 5
                        ? "Based on your early selections, we're starting to see patterns in your taste..."
                        : heartedMovies.length < 15
                          ? 'With your viewing history, we can identify themes you gravitate toward...'
                          : 'Your film collection reveals sophisticated taste patterns across genres and eras...'}
                    </div>
                    <div style={styles.understandingNote}>
                      <span style={styles.noteText}>
                        {heartedMovies.length < 5
                          ? 'More data needed for deeper insights'
                          : heartedMovies.length < 15
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
                      Based on your taste, explore our curated Italian Neorealism collection
                    </p>
                    <button style={styles.exploreButton}>
                      <span>View Collection</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {heartedMovies.length >= 5 && (
                    <div style={styles.quizCard}>
                      <div style={styles.learningHeader}>
                        <Sparkles size={16} color="#d4af37" />
                        <span style={styles.learningTitle}>Test Your Knowledge</span>
                      </div>
                      <p style={styles.learningText}>
                        You've seen enough films to try our cinema knowledge quiz
                      </p>
                      <button style={styles.quizButton}>
                        <span>Take Quiz</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'seen' && (
            <div style={styles.listTab}>
              <div style={styles.listHeader}>
                <h3 style={styles.listTitle}>Films You've Seen</h3>
                {heartedMovies.length > 5 && (
                  <div style={styles.listInsight}>
                    <Sparkles size={12} color="#d4af37" />
                    <span style={styles.listInsightText}>
                      Your viewing spans {Math.floor(heartedMovies.length / 3)} decades of cinema
                    </span>
                  </div>
                )}
              </div>

              {heartedMovies.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>✅</div>
                  <p style={styles.emptyTitle}>Start building your viewing history</p>
                  <p style={styles.emptySubtext}>Check off films as you watch them</p>
                </div>
              ) : (
                <div style={styles.filmGrid}>
                  {heartedMovies.map((movie, index) => (
                    <div key={movie.id || index} style={styles.filmCard}>
                      <MediaCard
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        initialPoster={movie.poster}
                        tmdbId={movie.tmdb_id}
                      />
                      {/* Quick reaction micro-interaction */}
                      <div style={styles.reactionBar}>
                        <span style={styles.reactionPrompt}>What did you think?</span>
                        <div style={styles.reactionButtons}>
                          <button style={styles.reactionButton} title="Loved it">
                            ❤️
                          </button>
                          <button style={styles.reactionButton} title="Liked it">
                            👍
                          </button>
                          <button style={styles.reactionButton} title="It was okay">
                            😐
                          </button>
                          <button style={styles.reactionButton} title="Not for me">
                            👎
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Learning insight after seeing multiple films */}
              {heartedMovies.length >= 5 && (
                <div style={styles.learningCard}>
                  <div style={styles.learningHeader}>
                    <BookOpen size={16} color="#d4af37" />
                    <span style={styles.learningTitle}>Taste Pattern</span>
                  </div>
                  <p style={styles.learningText}>
                    Based on your viewing history, you seem drawn to character-driven narratives.
                    Try rating a few films to help us understand what you connect with.
                  </p>
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
                      Perfect progression through world cinema
                    </span>
                  </div>
                )}
              </div>

              {bookmarkedMovies.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📚</div>
                  <p style={styles.emptyTitle}>Your queue is empty</p>
                  <p style={styles.emptySubtext}>Bookmark films to watch later</p>
                </div>
              ) : (
                <div style={styles.filmGrid}>
                  {bookmarkedMovies.map((movie, index) => (
                    <MediaCard
                      key={movie.id || index}
                      title={movie.title}
                      year={movie.year}
                      initialSlug={movie.slug}
                      initialPoster={movie.poster}
                      tmdbId={movie.tmdb_id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'platforms' && (
            <div style={styles.listTab}>
              <h3 style={styles.listTitle}>Streaming Access</h3>
              <div style={styles.platformContainer}>
                <PlatformSelector
                  onSelectionChange={handlePlatformChange}
                  initialSelected={selectedPlatforms}
                  showSelectedSection={false}
                  showHeader={false}
                />
              </div>
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
    margin: 0,
  },
  platformContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  filmCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  reactionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #f3f4f6',
  },
  reactionPrompt: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  reactionButtons: {
    display: 'flex',
    gap: '8px',
  },
  reactionButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s ease',
  },
};
