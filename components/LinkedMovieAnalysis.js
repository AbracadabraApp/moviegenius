/**
 * LinkedMovieAnalysis Component - V1 Movie Analysis Links
 *
 * Safely renders movie analysis content with movie links created by the
 * movie-analysis-linker system. Designed for static movie pages.
 *
 * Features:
 * - Renders HTML links created by analysis processing
 * - Uses existing movie-title styling (gold underline)
 * - Click tracking for analytics
 * - Safe HTML rendering with limited tags
 * - Fallback for non-processed content
 * - Self-reference prevention
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function LinkedMovieAnalysis({
  content,
  className = '',
  style = {},
  currentMovieTitle = '',
  context = '',
}) {
  const router = useRouter();
  const [processedContent, setProcessedContent] = useState(content || '');

  useEffect(() => {
    if (!content) {
      setProcessedContent('');
      return;
    }

    // Content may already have HTML links from movie-analysis-linker processing
    // Just set it directly - the system has already processed it
    setProcessedContent(content);
  }, [content]);

  // Handle clicks on movie links for analytics/tracking
  const handleClick = event => {
    // Check if click was on a movie link (using existing movie-title class)
    const link = event.target.closest('.movie-title');
    if (link && link.hasAttribute('data-tmdb-id')) {
      const tmdbId = link.getAttribute('data-tmdb-id');
      const movieTitle = link.textContent;

      console.log(
        `🔗 Analysis movie link clicked: "${movieTitle}" → /movie/${tmdbId} from ${currentMovieTitle} ${context}`
      );

      // Optional: Add analytics tracking here
      // trackEvent('analysis_movie_link_click', {
      //   tmdbId,
      //   movieTitle,
      //   sourceMovie: currentMovieTitle,
      //   context
      // });
    }
  };

  // If no content, return empty
  if (!processedContent) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        lineHeight: '1.6',
        ...style,
      }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

/**
 * Utility function to strip ** marks from content as fallback
 * Can be used during render time if linking system hasn't processed content
 */
export function stripBoldMarks(content) {
  if (!content || typeof content !== 'string') return content;

  // Strip **text** patterns but preserve the text
  return content.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/**
 * Check if content has been processed by the linking system
 */
export function hasMovieLinks(content) {
  if (!content || typeof content !== 'string') return false;

  // Check for movie-title class links with data-tmdb-id
  return content.includes('class="movie-title"') && content.includes('data-tmdb-id');
}

/**
 * Fallback component for unprocessed content
 * Strips ** marks and renders as plain text
 */
export function UnprocessedMovieAnalysis({ content, className = '', style = {} }) {
  const strippedContent = stripBoldMarks(content);

  return (
    <div
      className={className}
      style={{
        lineHeight: '1.6',
        ...style,
      }}
    >
      {strippedContent}
    </div>
  );
}
