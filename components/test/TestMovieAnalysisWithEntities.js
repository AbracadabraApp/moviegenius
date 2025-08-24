/**
 * TestMovieAnalysisWithEntities Component - Test Version of Production Analysis
 * 
 * Renders movie analysis with alternating text/media card sections.
 * Uses pre-processed static data with verified links.
 * Features:
 * - Alternating text and featured movie sections  
 * - Production-grade MediaCard components
 * - Explore Further topics with hover effects
 * - Why Watch recommendation section
 * - Smooth animations and transitions
 * 
 * @component
 */
import { useState, useEffect } from 'react';
import TestMediaCard from './TestMediaCard';
import ErrorBoundary from '../ErrorBoundary';

export default function TestMovieAnalysisWithEntities({
  sections = [],
  featuredMovies = [],
  exploreTopics = [],
  moreIdeas = [],
  whyWatch = null,
  className = '',
  animationDelay = 0,
}) {
  console.log('🧪 TEST MovieAnalysisWithEntities component loaded');
  
  // Animation state for smooth entrance
  const [isVisible, setIsVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    featuredMovies: true, // Start expanded to show content immediately
    exploreTopics: false,
    whyWatch: false
  });

  // Trigger smooth entrance animation when content is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);
    
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Toggle section expansion
  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <div 
      className={`test-movie-analysis ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <style jsx>{`
        .test-movie-analysis {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff;
        }
        
        /* Analysis Text Sections */
        .analysis-text-section {
          padding: 24px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          line-height: 1.75;
          font-size: 16px;
          color: #374151;
          transition: background 0.2s ease;
        }
        
        .analysis-text-section:hover {
          background: #fafafa;
        }
        
        .analysis-text-section :global(a.movie-title) {
          color: #dc2626;
          text-decoration: none;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: inline-block;
          margin: 0 1px;
        }
        
        .analysis-text-section :global(a.movie-title:hover) {
          background: #fef2f2;
          color: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
        }
        
        .analysis-text-section :global(a.person-name) {
          color: #7c3aed;
          text-decoration: none;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: inline-block;
          margin: 0 1px;
        }
        
        .analysis-text-section :global(a.person-name:hover) {
          background: #f3f0ff;
          color: #6d28d9;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(124, 58, 237, 0.1);
        }
        
        /* Featured Movies Section */
        .featured-movies-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
        }
        
        .section-header {
          padding: 24px 20px 16px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.2s ease;
        }
        
        .section-header:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        
        .section-title {
          display: flex;
          align-items: center;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          gap: 12px;
        }
        
        .section-icon {
          font-size: 20px;
          transition: transform 0.2s ease;
        }
        
        .section-header:hover .section-icon {
          transform: scale(1.1);
        }
        
        .expand-indicator {
          font-size: 24px;
          color: #6b7280;
          transition: all 0.2s ease;
        }
        
        .expand-indicator.expanded {
          transform: rotate(180deg);
        }
        
        .section-content {
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .section-content.collapsed {
          max-height: 0;
          padding: 0 20px;
        }
        
        .section-content.expanded {
          max-height: 2000px;
          padding: 0 20px 24px 20px;
        }
        
        .movie-cards-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        
        /* Explore Topics Section */
        .explore-topics-section {
          background: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        
        .topics-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        
        .topic-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .topic-card:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);
        }
        
        .topic-name {
          font-weight: 600;
          color: #1e40af;
          font-size: 16px;
          margin-bottom: 4px;
        }
        
        .topic-meta {
          color: #6b7280;
          font-size: 13px;
          display: flex;
          gap: 8px;
        }
        
        .topic-category {
          background: rgba(59, 130, 246, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        
        /* Why Watch Section */
        .why-watch-section {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        
        .recommendation-content {
          display: grid;
          gap: 16px;
        }
        
        .recommendation-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 24px;
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 4px 8px rgba(34, 197, 94, 0.2);
          justify-self: start;
        }
        
        .reasons-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 12px;
        }
        
        .reason-item {
          background: white;
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 12px;
          padding: 16px;
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
          position: relative;
          padding-left: 48px;
          transition: all 0.2s ease;
        }
        
        .reason-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.3);
        }
        
        .reason-item::before {
          content: '✓';
          position: absolute;
          left: 16px;
          top: 16px;
          color: #16a34a;
          font-weight: bold;
          font-size: 18px;
        }
        
        /* Animations */
        .fade-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      {/* Analysis Text Sections */}
      {sections.map((section, index) => (
        <div 
          key={index} 
          className="analysis-text-section fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div dangerouslySetInnerHTML={{ __html: section.content }} />
        </div>
      ))}

      {/* Featured Movies Section */}
      {featuredMovies.length > 0 && (
        <div className="featured-movies-section">
          <div 
            className="section-header"
            onClick={() => toggleSection('featuredMovies')}
          >
            <div className="section-title">
              <span className="section-icon">🎬</span>
              Featured Films
            </div>
            <div className={`expand-indicator ${expandedSections.featuredMovies ? 'expanded' : ''}`}>
              ⌄
            </div>
          </div>
          <div className={`section-content ${expandedSections.featuredMovies ? 'expanded' : 'collapsed'}`}>
            <div className="movie-cards-grid">
              {featuredMovies.map((movie, index) => (
                <ErrorBoundary key={index} level="component">
                  <TestMediaCard
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.description}
                    tmdbId={`featured-${index}`}
                    isTestMode={true}
                  />
                </ErrorBoundary>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Explore Topics Section */}
      {exploreTopics.length > 0 && (
        <div className="explore-topics-section">
          <div 
            className="section-header"
            onClick={() => toggleSection('exploreTopics')}
          >
            <div className="section-title">
              <span className="section-icon">🧭</span>
              Explore Further
            </div>
            <div className={`expand-indicator ${expandedSections.exploreTopics ? 'expanded' : ''}`}>
              ⌄
            </div>
          </div>
          <div className={`section-content ${expandedSections.exploreTopics ? 'expanded' : 'collapsed'}`}>
            <div className="topics-grid">
              {exploreTopics.map((topic, index) => (
                <div 
                  key={index} 
                  className="topic-card"
                  onClick={() => console.log('🧪 TEST: Would explore topic:', topic.topic)}
                >
                  <div className="topic-name">{topic.topic}</div>
                  <div className="topic-meta">
                    {topic.category && (
                      <span className="topic-category">{topic.category}</span>
                    )}
                    {topic.difficulty && (
                      <span style={{ color: '#9ca3af' }}>• {topic.difficulty}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Why Watch Section */}
      {whyWatch && (
        <div className="why-watch-section">
          <div 
            className="section-header"
            onClick={() => toggleSection('whyWatch')}
          >
            <div className="section-title">
              <span className="section-icon">⭐</span>
              Why Watch
            </div>
            <div className={`expand-indicator ${expandedSections.whyWatch ? 'expanded' : ''}`}>
              ⌄
            </div>
          </div>
          <div className={`section-content ${expandedSections.whyWatch ? 'expanded' : 'collapsed'}`}>
            <div className="recommendation-content">
              {whyWatch.recommendation && (
                <div className="recommendation-badge">
                  📍 {whyWatch.recommendation}
                </div>
              )}
              {whyWatch.reasons && whyWatch.reasons.length > 0 && (
                <ul className="reasons-list">
                  {whyWatch.reasons.map((reason, index) => (
                    <li 
                      key={index} 
                      className="reason-item"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* More Ideas Section */}
      {moreIdeas.length > 0 && (
        <div className="featured-movies-section" style={{ background: '#fafafa' }}>
          <div className="section-header">
            <div className="section-title">
              <span className="section-icon">💡</span>
              More Ideas
            </div>
          </div>
          <div className="section-content expanded">
            <div className="movie-cards-grid">
              {moreIdeas.map((idea, index) => (
                <div 
                  key={index}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                    {idea.title} {idea.year && `(${idea.year})`}
                  </div>
                  {idea.connection && (
                    <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                      {idea.connection}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}