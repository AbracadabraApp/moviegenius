/**
 * TestLinkedMovieAnalysis - Copy of LinkedMovieAnalysis.js for testing
 * Renders movie analysis content with HTML links from processed content
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function TestLinkedMovieAnalysis({
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

    // Content should already have HTML links from processing
    setProcessedContent(content);
  }, [content]);

  // Handle clicks on movie links for analytics/tracking
  const handleClick = event => {
    const link = event.target.closest('.movie-title');
    if (link && link.hasAttribute('data-tmdb-id')) {
      const tmdbId = link.getAttribute('data-tmdb-id');
      const movieTitle = link.textContent;

      console.log(
        `🔗 Test: Analysis movie link clicked: "${movieTitle}" → /movie/${tmdbId} from ${currentMovieTitle} ${context}`
      );
      
      // Navigate to movie page
      router.push(`/movie/${tmdbId}`);
    }
  };

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
 * Test utility functions
 */
export function stripBoldMarks(content) {
  if (!content || typeof content !== 'string') return content;
  return content.replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function hasMovieLinks(content) {
  if (!content || typeof content !== 'string') return false;
  return content.includes('class="movie-title"') && content.includes('data-tmdb-id');
}

export function TestUnprocessedMovieAnalysis({ content, className = '', style = {} }) {
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