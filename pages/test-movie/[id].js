// pages/test-movie/[id].js - Production-Grade Test Movie Page
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Heart, Bookmark, Share, ChevronDown, ChevronUp } from 'lucide-react';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import TestMovieHeaderLarge from '../../components/test/TestMovieHeaderLarge';
import TestMovieAnalysisWithEntities from '../../components/test/TestMovieAnalysisWithEntities';
import TestMovieCreativeFooter from '../../components/test/TestMovieCreativeFooter';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function TestMovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [movieData, setMovieData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!router.isReady || !id) {
      return;
    }

    const loadStaticMovie = async () => {
      try {
        setLoading(true);
        
        // Load static JSON file from test-movies directory
        const response = await fetch(`/data/test-movies/${id}.json`);
        
        if (!response.ok) {
          throw new Error(`Test movie ${id} not found`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded test movie: ${data.title} (${data.year})`);
        
        setMovieData(data);
        setError(null);
        
      } catch (err) {
        console.error(`❌ Failed to load test movie ${id}:`, err);
        setError(err.message);
        setMovieData(null);
      } finally {
        setLoading(false);
      }
    };

    loadStaticMovie();
  }, [router.isReady, id]);

  // Error state
  if (error) {
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%', padding: '20px', textAlign: 'center' }}>
          {/* Simple Search Bar */}
          <div style={{ padding: '16px 20px 16px 20px' }}>
            <SimpleSearch
              onResults={() => {}}
              placeholder="Search Movies . . ."
              useUnifiedSearch={true}
            />
          </div>
          
          <div style={{ marginTop: '60px' }}>
            <h2 style={{ fontSize: '24px', color: '#374151', marginBottom: '12px' }}>
              Test Movie Not Found
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
              Test movie "{id}" doesn't exist in the test environment.
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Available test movies: test_000059fa, test_00032d9f, test_00014fb9, test_00018052, test_0003155b
            </p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Loading state
  if (loading || !movieData) {
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
          {/* Simple Search Bar */}
          <div style={{ padding: '16px 20px 16px 20px' }}>
            <SimpleSearch
              onResults={() => {}}
              placeholder="Search Movies . . ."
              useUnifiedSearch={true}
            />
          </div>
          
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
            <p>Loading test movie...</p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Simple search handler
  const handleSearchResults = (results) => {
    // SimpleSearch component handles navigation automatically
  };

  return (
    <ErrorBoundary level="page">
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
          {/* Simple Search Bar */}
          <ErrorBoundary level="section">
            <div style={{ padding: '16px 20px 16px 20px' }}>
              <SimpleSearch
                onResults={handleSearchResults}
                placeholder="Search Movies . . ."
                useUnifiedSearch={true}
              />
            </div>
          </ErrorBoundary>

          {/* Production-Grade Movie Header */}
          <ErrorBoundary level="section">
            <div style={{ paddingLeft: '0px' }}>
              <TestMovieHeaderLarge
                title={movieData.title}
                year={movieData.year}
                overview={movieData.overview}
                poster={movieData.poster_url}
                tmdbId={movieData.tmdbId}
                director={movieData.director}
                genre={movieData.genre}
                streaming={movieData.streaming}
              />
            </div>
          </ErrorBoundary>

          {/* Production-Grade Movie Analysis */}
          <ErrorBoundary 
            level="section"
            fallback={null}
          >
            <div className="production-movie-content">
              <style jsx>{`
                .production-movie-content {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: #ffffff;
                }
                
                /* Analysis Text Sections */
                .analysis-text-section {
                  padding: 20px;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                  line-height: 1.75;
                  font-size: 15px;
                  color: #374151;
                  transition: all 0.3s ease;
                }
                
                .analysis-text-section.expanded {
                  background: #fafafa;
                }
                
                .analysis-text-section :global(a.movie-title) {
                  color: #dc2626;
                  text-decoration: none;
                  font-weight: 600;
                  padding: 2px 4px;
                  border-radius: 4px;
                  transition: all 0.2s ease;
                }
                
                .analysis-text-section :global(a.movie-title:hover) {
                  background: #fef2f2;
                  color: #b91c1c;
                }
                
                .analysis-text-section :global(a.person-name) {
                  color: #7c3aed;
                  text-decoration: none;
                  font-weight: 500;
                  padding: 2px 4px;
                  border-radius: 4px;
                  transition: all 0.2s ease;
                }
                
                .analysis-text-section :global(a.person-name:hover) {
                  background: #f3f0ff;
                  color: #6d28d9;
                }
                
                /* Featured Films Section */
                .featured-films-section {
                  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                }
                
                .section-header {
                  padding: 20px 20px 12px 20px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  cursor: pointer;
                  transition: background 0.2s ease;
                }
                
                .section-header:hover {
                  background: rgba(0, 0, 0, 0.02);
                }
                
                .section-title {
                  display: flex;
                  align-items: center;
                  font-size: 18px;
                  font-weight: 600;
                  color: #1f2937;
                }
                
                .section-icon {
                  margin-right: 8px;
                  font-size: 16px;
                }
                
                .expand-button {
                  padding: 4px;
                  border-radius: 4px;
                  transition: background 0.2s ease;
                  color: #6b7280;
                }
                
                .expand-button:hover {
                  background: rgba(0, 0, 0, 0.1);
                  color: #374151;
                }
                
                .section-content {
                  max-height: 0;
                  overflow: hidden;
                  transition: max-height 0.3s ease;
                }
                
                .section-content.expanded {
                  max-height: 1000px;
                }
                
                .movie-cards-grid {
                  padding: 0 20px 20px 20px;
                  display: grid;
                  gap: 12px;
                }
                
                .movie-card {
                  background: white;
                  border-radius: 12px;
                  padding: 16px;
                  border: 1px solid rgba(0, 0, 0, 0.08);
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
                  transition: all 0.2s ease;
                  position: relative;
                }
                
                .movie-card:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
                  border-color: rgba(0, 0, 0, 0.12);
                }
                
                .movie-card-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 8px;
                }
                
                .movie-card-title {
                  font-weight: 600;
                  color: #1f2937;
                  font-size: 16px;
                  line-height: 1.4;
                }
                
                .movie-card-actions {
                  display: flex;
                  gap: 8px;
                  opacity: 0;
                  transition: opacity 0.2s ease;
                }
                
                .movie-card:hover .movie-card-actions {
                  opacity: 1;
                }
                
                .action-button {
                  padding: 6px;
                  border-radius: 6px;
                  background: rgba(0, 0, 0, 0.04);
                  color: #6b7280;
                  transition: all 0.2s ease;
                  cursor: pointer;
                  border: none;
                }
                
                .action-button:hover {
                  background: rgba(0, 0, 0, 0.08);
                  color: #374151;
                }
                
                .action-button.active {
                  background: #dc2626;
                  color: white;
                }
                
                .movie-card-description {
                  color: #6b7280;
                  font-size: 14px;
                  line-height: 1.5;
                  margin-top: 8px;
                }
                
                /* Explore Topics Section */
                .explore-topics-section {
                  background: #ffffff;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                }
                
                .topics-grid {
                  padding: 0 20px 20px 20px;
                  display: grid;
                  gap: 8px;
                }
                
                .topic-card {
                  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                  border: 1px solid #bfdbfe;
                  border-radius: 16px;
                  padding: 12px 16px;
                  transition: all 0.2s ease;
                  cursor: pointer;
                }
                
                .topic-card:hover {
                  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                  transform: translateY(-1px);
                  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
                }
                
                .topic-name {
                  font-weight: 600;
                  color: #1e40af;
                  font-size: 14px;
                }
                
                .topic-meta {
                  color: #6b7280;
                  font-size: 12px;
                  margin-top: 2px;
                }
                
                /* Why Watch Section */
                .why-watch-section {
                  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                }
                
                .why-watch-content {
                  padding: 0 20px 20px 20px;
                }
                
                .recommendation-badge {
                  display: inline-flex;
                  align-items: center;
                  background: #16a34a;
                  color: white;
                  padding: 6px 12px;
                  border-radius: 20px;
                  font-weight: 600;
                  font-size: 12px;
                  margin-bottom: 16px;
                }
                
                .reasons-list {
                  list-style: none;
                  padding: 0;
                  margin: 0;
                }
                
                .reason-item {
                  background: white;
                  border: 1px solid rgba(34, 197, 94, 0.2);
                  border-radius: 8px;
                  padding: 12px;
                  margin-bottom: 8px;
                  font-size: 14px;
                  line-height: 1.5;
                  color: #374151;
                  position: relative;
                  padding-left: 32px;
                }
                
                .reason-item::before {
                  content: '✓';
                  position: absolute;
                  left: 12px;
                  top: 12px;
                  color: #16a34a;
                  font-weight: bold;
                }
              `}</style>
              
              {/* Analysis Text Sections */}
              {movieData.sections && movieData.sections.map((section, index) => (
                <div 
                  key={index} 
                  className={`analysis-text-section ${expandedSections[`text-${index}`] ? 'expanded' : ''}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: section.content }} />
                </div>
              ))}

              {/* Featured Films Section */}
              {movieData.featuredMovies && movieData.featuredMovies.length > 0 && (
                <div className="featured-films-section">
                  <div 
                    className="section-header"
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      featuredFilms: !prev.featuredFilms
                    }))}
                  >
                    <div className="section-title">
                      <span className="section-icon">🎬</span>
                      Featured Films
                    </div>
                    <div className="expand-button">
                      {expandedSections.featuredFilms ? 
                        <ChevronUp size={18} /> : 
                        <ChevronDown size={18} />
                      }
                    </div>
                  </div>
                  <div className={`section-content ${expandedSections.featuredFilms ? 'expanded' : ''}`}>
                    <div className="movie-cards-grid">
                      {movieData.featuredMovies.map((movie, index) => (
                        <div key={index} className="movie-card">
                          <div className="movie-card-header">
                            <div className="movie-card-title">
                              {movie.title} ({movie.year})
                            </div>
                            <div className="movie-card-actions">
                              <button 
                                className={`action-button ${hearted ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHearted(!hearted);
                                }}
                              >
                                <Heart size={14} fill={hearted ? 'currentColor' : 'none'} />
                              </button>
                              <button 
                                className={`action-button ${bookmarked ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBookmarked(!bookmarked);
                                }}
                              >
                                <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          </div>
                          {movie.description && (
                            <div className="movie-card-description">
                              {movie.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Explore Topics Section */}
              {movieData.exploreTopics && movieData.exploreTopics.length > 0 && (
                <div className="explore-topics-section">
                  <div 
                    className="section-header"
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      exploreTopics: !prev.exploreTopics
                    }))}
                  >
                    <div className="section-title">
                      <span className="section-icon">🧭</span>
                      Explore Further
                    </div>
                    <div className="expand-button">
                      {expandedSections.exploreTopics ? 
                        <ChevronUp size={18} /> : 
                        <ChevronDown size={18} />
                      }
                    </div>
                  </div>
                  <div className={`section-content ${expandedSections.exploreTopics ? 'expanded' : ''}`}>
                    <div className="topics-grid">
                      {movieData.exploreTopics.map((topic, index) => (
                        <div key={index} className="topic-card">
                          <div className="topic-name">{topic.topic}</div>
                          <div className="topic-meta">
                            {topic.category && `${topic.category}`}
                            {topic.category && topic.difficulty && ' • '}
                            {topic.difficulty && topic.difficulty}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Why Watch Section */}
              {movieData.whyWatch && (
                <div className="why-watch-section">
                  <div 
                    className="section-header"
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      whyWatch: !prev.whyWatch
                    }))}
                  >
                    <div className="section-title">
                      <span className="section-icon">⭐</span>
                      Why Watch
                    </div>
                    <div className="expand-button">
                      {expandedSections.whyWatch ? 
                        <ChevronUp size={18} /> : 
                        <ChevronDown size={18} />
                      }
                    </div>
                  </div>
                  <div className={`section-content ${expandedSections.whyWatch ? 'expanded' : ''}`}>
                    <div className="why-watch-content">
                      {movieData.whyWatch.recommendation && (
                        <div className="recommendation-badge">
                          {movieData.whyWatch.recommendation}
                        </div>
                      )}
                      {movieData.whyWatch.reasons && (
                        <ul className="reasons-list">
                          {movieData.whyWatch.reasons.map((reason, index) => (
                            <li key={index} className="reason-item">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ErrorBoundary>

          {/* Movie Creative Footer - Test Version */}
          <ErrorBoundary level="section">
            <TestMovieCreativeFooter 
              keyElements={movieData.keyElements}
              title={movieData.title}
              year={movieData.year}
            />
          </ErrorBoundary>

          {/* Test Environment Badge */}
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000
          }}>
            TEST ENV
          </div>
        </div>
      </PhoneFrame>
    </ErrorBoundary>
  );
}

// Static generation for test movies
export async function getStaticPaths() {
  // Test movie IDs from generated static files
  const testMovieIds = [
    'test_000059fa', // Buena Vista Social Club
    'test_00032d9f', // Less Than Zero
    'test_00014fb9', // Murder, My Sweet
    'test_00018052', // Testament of Orpheus
    'test_0003155b'  // No Time for Sergeants
  ];
  
  const paths = testMovieIds.map(id => ({ params: { id } }));
  
  console.log(`🧪 Pre-generating ${paths.length} test movie paths`);
  
  return {
    paths,
    fallback: false // Only allow pre-defined test movies
  };
}

export async function getStaticProps({ params }) {
  const { id } = params;
  
  // For test movies, we'll load the data client-side from static JSON files
  // This keeps the test environment simple and isolated
  
  return {
    props: {
      testMovieId: id
    },
    revalidate: false // Test data doesn't need revalidation
  };
}