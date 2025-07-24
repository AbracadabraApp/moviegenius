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
import StreamingAnalysisDisplay from '../../components/StreamingAnalysisDisplay';
import { filterCurrentMovie } from '../../lib/filterCurrentMovie';

export default function ExplorePage({ pageData, error, topic, context }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(!pageData);

  // Handle search results
  const handleSearchResults = results => {
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
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Unable to load this explore topic</div>
            <button style={styles.retryButton} onClick={() => window.location.reload()}>
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
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
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
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>

        {/* Page Header */}
        <div style={styles.headerSection}>
          <h1 style={styles.pageTitle}>{pageData.title}</h1>
          {context && <p style={styles.contextText}>Exploring in relation to {context}</p>}
        </div>

        {/* Main Content - Streaming Typewriter */}
        <div style={styles.contentSection}>
          <StreamingAnalysisDisplay
            movieId={`explore-${topic.replace(/\s+/g, '-')}`}
            movieTitle={pageData.title}
            movieYear={context}
            onComplete={() => console.log('Explore content streaming complete')}
            onError={(error) => console.error('Explore streaming error:', error)}
            settings={{
              speed: 'normal',
              showCursor: true,
              skipable: true,
              autoStart: true,
              enhancedTypography: true,
            }}
          />

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

// Import the explore page generation logic directly
import { createClient } from '@supabase/supabase-js';
import { getCache } from '../../lib/cache.js';
import { Anthropic } from '@anthropic-ai/sdk';

// Initialize clients for static generation
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder-key',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// Direct generation function for static props
async function generateExplorePageDirect(topic, context = '') {
  // For static generation, use a simplified approach without external APIs
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-key') {
    return generateFallbackExplorePage(topic, context);
  }

  try {
    const cache = getCache();
    const cacheKey = `explore_page:${topic}:${context}`.toLowerCase().replace(/[^a-z0-9:]/g, '_');

    return await cache.cacheClaudeResponse(
      cacheKey,
      'claude-3-5-sonnet-20241022',
      async () => {
        const fullTopic = context ? `${topic} (in relation to ${context})` : topic;
        const prompt = `Create comprehensive educational content about "${fullTopic}" for film enthusiasts.

Format as:
TITLE: [Clear title]
PARAGRAPH: [Opening paragraph with examples]
PARAGRAPH: [Detailed analysis]  
PARAGRAPH: [Historical context]
SUBHEAD: Key Films and Directors
PARAGRAPH: [Important films analysis]
PARAGRAPH: [Technical analysis]
SUBHEAD: Modern Influence
PARAGRAPH: [Contemporary influence]
PARAGRAPH: [Conclusion with recommendations]
MOVIES: title|year|description|streaming (6-8 films)
NEXT_STEPS: step1|step2|step3`;

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        });

        const responseText = message.content[0].text;
        return parseExplorePage(responseText, topic);
      },
      2592000 // 30-day cache
    );
  } catch (error) {
    console.error('Static generation fallback for explore page:', error);
    return generateFallbackExplorePage(topic, context);
  }
}

// Fallback content generator
function generateFallbackExplorePage(topic, context) {
  return {
    title: topic,
    sections: [
      {
        type: 'text',
        content: `${topic} represents a fascinating area of cinema that has influenced countless films and filmmakers. This topic encompasses various techniques, themes, and approaches that have shaped the art of filmmaking.`,
      },
      {
        type: 'text', 
        content: `To fully appreciate ${topic}, it's helpful to examine how different directors and movements have approached this concept throughout film history.`,
      },
    ],
    movies: [
      { title: 'Citizen Kane', year: 1941, slug: 'Foundational techniques', streaming: 'Archive.org' },
      { title: 'Vertigo', year: 1958, slug: 'Visual storytelling', streaming: 'Kanopy' },
      { title: 'The Godfather', year: 1972, slug: 'Narrative structure', streaming: 'Prime Video' },
    ],
    nextSteps: ['Explore related techniques', 'Study influential directors', 'Watch chronologically'],
    generatedAt: new Date().toISOString(),
  };
}

// Parse response into sections
function parseExplorePage(responseText, topic = 'Film Topic') {
  const lines = responseText.split('\n');
  const sections = [];
  const movies = [];
  const nextSteps = [];
  let currentSection = null;
  let title = topic;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith('TITLE:')) {
      title = trimmedLine.replace('TITLE:', '').trim();
    } else if (trimmedLine.startsWith('PARAGRAPH:')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'text', content: trimmedLine.replace('PARAGRAPH:', '').trim() };
    } else if (trimmedLine.startsWith('SUBHEAD:')) {
      if (currentSection) sections.push(currentSection);
      sections.push({ type: 'subhead', content: trimmedLine.replace('SUBHEAD:', '').trim() });
      currentSection = null;
    } else if (trimmedLine.startsWith('MOVIES:')) {
      const movieLine = trimmedLine.replace('MOVIES:', '').trim();
      if (movieLine) {
        const parts = movieLine.split('|');
        if (parts.length >= 2) {
          movies.push({
            title: parts[0]?.trim() || 'Unknown',
            year: parseInt(parts[1]?.trim()) || new Date().getFullYear(),
            slug: parts[2]?.trim() || 'Essential viewing',
            streaming: parts[3]?.trim() || 'Check services',
          });
        }
      }
    } else if (trimmedLine.startsWith('NEXT_STEPS:')) {
      const stepsLine = trimmedLine.replace('NEXT_STEPS:', '').trim();
      if (stepsLine) {
        nextSteps.push(...stepsLine.split('|').map(s => s.trim()).filter(s => s));
      }
    } else if (currentSection && trimmedLine) {
      currentSection.content += ' ' + trimmedLine;
    }
  }

  if (currentSection) sections.push(currentSection);

  return { title, sections, movies, nextSteps, generatedAt: new Date().toISOString() };
}

// Static generation for explore pages
export async function getStaticProps({ params }) {
  const { slug } = params;

  // Parse slug to extract topic and context
  const slugParts = slug || [];
  const topic = slugParts[0] ? slugParts[0].replace(/-/g, ' ') : 'Film Topic';
  const context = slugParts[1] ? slugParts[1].replace(/-/g, ' ') : '';

  try {
    // Generate content directly without HTTP calls
    const pageData = await generateExplorePageDirect(topic, context);

    return {
      props: {
        pageData,
        topic,
        context,
        error: null,
      },
      revalidate: 86400, // Revalidate once per day
    };
  } catch (error) {
    console.error('Error in getStaticProps for explore page:', error);

    // Return fallback content instead of error
    const fallbackData = generateFallbackExplorePage(topic, context);

    return {
      props: {
        pageData: fallbackData,
        topic,
        context,
        error: null, // Don't show error to users, use fallback
      },
      revalidate: 300, // Retry sooner
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
    'deep-focus-photography',
  ];

  const paths = commonTopics.map(topic => ({
    params: { slug: [topic] },
  }));

  return {
    paths,
    fallback: 'blocking', // Generate other topics on demand
  };
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
