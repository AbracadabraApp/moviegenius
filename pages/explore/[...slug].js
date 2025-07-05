// pages/explore/[...slug].js
/**
 * Static Explore Further Pages
 * 
 * Serves pre-generated content for "Explore Further" topics to replace
 * slow Ask queries. Routes like:
 * - /explore/cyberpunk-visual-style
 * - /explore/german-expressionism/citizen-kane
 * - /explore/film-noir-lighting
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import MediaCard from '../../components/MediaCard';
import BackButton from '../../components/BackButton';
import EntityLinkedText from '../../components/EntityLinkedText';
import { filterCurrentMovie } from '../../lib/filterCurrentMovie';

export default function ExplorePage({ pageData, error, topic, context }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(!pageData);

  // Handle search results
  const handleSearchResults = (results) => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on Explore page:', results);
  };

  // If we have an error, show error state
  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <BackButton variant="icon" context="explore" position="top-left" />
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Unable to load this explore topic</div>
            <button 
              style={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Loading state
  if (isLoading || !pageData) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <BackButton variant="icon" context="explore" position="top-left" />
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingRow}>
              <img 
                src="/icons/loading/film-movie-reel-icon.png" 
                alt="Loading..." 
                style={styles.filmIcon}
              />
              <span style={styles.loadingText}>Exploring the archives...</span>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Input Area */}
        <div style={styles.inputArea}>
          <BackButton variant="icon" context="explore" position="top-left" />
          <SimpleSearch onResults={handleSearchResults} />
        </div>

        {/* Page Header */}
        <div style={styles.headerSection}>
          <h1 style={styles.pageTitle}>{pageData.title}</h1>
          {context && (
            <p style={styles.contextText}>Exploring in relation to {context}</p>
          )}
        </div>

        {/* Main Content */}
        <div style={styles.contentSection}>
          {pageData.sections && pageData.sections.map((section, index) => (
            <div key={index} style={styles.sectionContainer}>
              {section.type === 'text' && (
                <div style={styles.textSection}>
                  <EntityLinkedText
                    text={section.content}
                    linkMovies={true}
                    linkingStyle="on"
                    style={styles.paragraphText}
                  />
                </div>
              )}
              {section.type === 'subhead' && (
                <h2 style={styles.subhead}>{section.content}</h2>
              )}
            </div>
          ))}

          {/* Essential Films Section */}
          {pageData.movies && pageData.movies.length > 0 && (
            <div style={styles.moviesSection}>
              <h3 style={styles.moviesTitle}>Essential Films</h3>
              <div style={styles.movieList}>
                {pageData.movies.map((movie, index) => (
                  <MediaCard
                    key={index}
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    initialStreaming={movie.streaming}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Next Steps Section */}
          {pageData.nextSteps && pageData.nextSteps.length > 0 && (
            <div style={styles.nextStepsSection}>
              <h3 style={styles.nextStepsTitle}>Continue Exploring</h3>
              <div style={styles.nextStepsList}>
                {pageData.nextSteps.map((step, index) => (
                  <div 
                    key={index}
                    style={styles.nextStepItem}
                    onClick={() => {
                      console.log('Clicked next step:', step);
                      // Could navigate to a new explore page for this step
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ask Follow-up */}
          <div style={styles.followUpSection}>
            <h3 style={styles.followUpTitle}>Have more questions?</h3>
            <div style={styles.followUpInputContainer}>
              <SimpleSearch 
                onResults={handleSearchResults}
                placeholder={`Ask more about ${pageData.title.toLowerCase()}...`}
              />
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Static generation for explore pages
export async function getStaticProps({ params }) {
  const { slug } = params;
  
  // Parse slug to extract topic and context
  const slugParts = slug || [];
  const topic = slugParts[0] ? slugParts[0].replace(/-/g, ' ') : 'Film Topic';
  const context = slugParts[1] ? slugParts[1].replace(/-/g, ' ') : '';

  try {
    // Generate the page content
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-explore-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        context
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      return {
        props: {
          pageData: data.data,
          topic,
          context,
          error: null
        },
        revalidate: 86400 // Revalidate once per day
      };
    } else {
      console.error('Failed to generate explore page:', response.status);
      
      return {
        props: {
          pageData: null,
          topic,
          context,
          error: 'Failed to generate content'
        },
        revalidate: 300 // Retry sooner on error
      };
    }
  } catch (error) {
    console.error('Error in getStaticProps for explore page:', error);
    
    return {
      props: {
        pageData: null,
        topic,
        context,
        error: 'Page generation error'
      },
      revalidate: 300
    };
  }
}

// Generate paths for common explore topics
export async function getStaticPaths() {
  // Pre-generate some common explore topics
  const commonTopics = [
    'film-noir-lighting',
    'german-expressionism',
    'cyberpunk-aesthetics',
    'french-new-wave',
    'italian-neorealism',
    'silent-film-techniques',
    'color-in-cinema',
    'sound-design',
    'montage-theory',
    'deep-focus-photography'
  ];

  const paths = commonTopics.map(topic => ({
    params: { slug: [topic] }
  }));

  return {
    paths,
    fallback: 'blocking' // Generate other topics on demand
  };
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inputArea: {
    padding: '5px',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  headerSection: {
    padding: '24px 36px 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f3f4f6',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
    lineHeight: '1.2',
  },
  contextText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  contentSection: {
    flex: 1,
    padding: '0 36px 24px',
  },
  sectionContainer: {
    marginBottom: '24px',
  },
  textSection: {
    marginBottom: '16px',
  },
  paragraphText: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
  },
  subhead: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: '32px 0 16px 0',
    lineHeight: '1.3',
  },
  moviesSection: {
    marginTop: '32px',
    marginBottom: '32px',
  },
  moviesTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  nextStepsSection: {
    marginTop: '32px',
    marginBottom: '32px',
  },
  nextStepsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  nextStepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  nextStepItem: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  followUpSection: {
    marginTop: '40px',
    padding: '24px 0',
    borderTop: '1px solid #f3f4f6',
  },
  followUpTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  followUpInputContainer: {
    maxWidth: '500px',
  },
  followUpInput: {
    fontSize: '14px',
    padding: '12px 16px',
  },
  loadingContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  filmIcon: {
    width: '48px',
    height: '48px',
  },
  errorContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    marginBottom: '16px',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};