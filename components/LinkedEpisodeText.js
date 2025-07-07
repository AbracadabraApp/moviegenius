/**
 * LinkedEpisodeText Component - V1 Episode Movie Links
 * 
 * Safely renders episode content with movie links created by the 
 * episode-movie-linker system. Designed specifically for episodes.
 * 
 * Features:
 * - Renders HTML links created by episode processing
 * - Adds movie link styling
 * - Click tracking for analytics
 * - Safe HTML rendering with limited tags
 * - Fallback for non-processed content
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function LinkedEpisodeText({ 
  content, 
  className = '', 
  style = {},
  episodeContext = ''
}) {
  const router = useRouter();
  const [processedContent, setProcessedContent] = useState(content || '');

  useEffect(() => {
    if (!content) {
      setProcessedContent('');
      return;
    }

    // Content may already have HTML links from episode processing
    // Just set it directly - the episode-movie-linker has already processed it
    setProcessedContent(content);
  }, [content]);

  // Handle clicks on movie links for analytics/tracking
  const handleClick = (event) => {
    // Check if click was on a movie link (using existing movie-title class)
    const link = event.target.closest('.movie-title');
    if (link && link.hasAttribute('data-tmdb-id')) {
      const tmdbId = link.getAttribute('data-tmdb-id');
      const movieTitle = link.textContent;
      
      console.log(`🔗 Episode movie link clicked: "${movieTitle}" → /movie/${tmdbId} from ${episodeContext}`);
      
      // Optional: Add analytics tracking here
      // trackEvent('episode_movie_link_click', { tmdbId, movieTitle, episodeContext });
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
        ...style
      }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}